import Busboy from "busboy";
import pdfParse from "pdf-parse";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

export const config = {
  api: {
    bodyParser: false,
  },
};

function safeMsg(input, max = 900) {
  const s = String(input ?? "");
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function stageToProgress(stage) {
  // Orchestrator stages (from your orchestrator.ts doc) + our pipeline labels
  const map = {
    queued: 0,
    running: 5,

    "PDF parsing": 10,
    "Text extracted": 25,

    start: 30,

    schema_extract_start: 40,
    schema_extract_done: 55,
    schema_skipped: 55,

    db_insert_start: 75,
    db_insert_row: 85,
    db_insert_done: 90,

    resolve_relationships_start: 92,
    resolve_relationships_done: 95,

    root_campaign_captured: 96,

    completed: 100,
    error: 0,
  };

  return map[stage] ?? null;
}

async function jobUpdate(jobId, patch) {
  // patch: { status?, progress?, current_stage?, updated_at? }
  const sets = [];
  const values = [jobId];
  let i = 2;

  if (patch.status !== undefined) {
    sets.push(`status = $${i++}`);
    values.push(patch.status);
  }
  if (patch.progress !== undefined && patch.progress !== null) {
    sets.push(`progress = $${i++}`);
    values.push(patch.progress);
  }
  if (patch.current_stage !== undefined) {
    sets.push(`current_stage = $${i++}`);
    values.push(patch.current_stage);
  }

  // always bump updated_at unless caller explicitly disables
  sets.push(`updated_at = NOW()`);

  if (!sets.length) return;

  await query(
    `
    UPDATE ingestion_jobs
       SET ${sets.join(", ")}
     WHERE id = $1
    `,
    values
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  let responseSent = false;
  let busboyFinished = false;

  // NOTE: This timeout is only for "did we at least create the job + respond?"
  const HARD_TIMEOUT_MS = 15000;
  const hardTimeout = setTimeout(() => {
    if (responseSent) return;
    try {
      res.status(504).json({
        ok: false,
        error: "Server did not reach job creation",
      });
      responseSent = true;
    } catch {}
  }, HARD_TIMEOUT_MS);

  try {
    const ctx = await getTenantContext(req);
    const userId = ctx.userId;

    const events = [];

    // Safer Busboy import (ESM/CJS interop)
    const BusboyFactory = Busboy?.default ?? Busboy;
    const busboy = BusboyFactory({ headers: req.headers });

    events.push({
      stage: "busboy_init",
      message: "Busboy initialized",
      ts: new Date().toISOString(),
    });

    let pdfChunks = [];
    let fileFound = false;
    let totalBytes = 0;

    // Optional: basic server-side size guard (prevents runaway memory usage)
    const MAX_BYTES = 220 * 1024 * 1024; // ~220MB buffer cap (nginx is 200M in your config)

    busboy.on("file", (fieldname, file, info) => {
      if (fieldname !== "file") {
        file.resume();
        return;
      }

      fileFound = true;

      events.push({
        stage: "busboy_file_detected",
        message: info?.filename ?? "unknown.pdf",
        ts: new Date().toISOString(),
      });

      file.on("data", (chunk) => {
        totalBytes += chunk.length;

        if (totalBytes > MAX_BYTES) {
          events.push({
            stage: "busboy_error",
            message: `Upload too large (>${MAX_BYTES} bytes). Aborting.`,
            ts: new Date().toISOString(),
          });
          // stop reading
          try {
            file.unpipe?.();
          } catch {}
          try {
            file.resume();
          } catch {}
          try {
            req.destroy(new Error("Upload too large"));
          } catch {}
          return;
        }

        pdfChunks.push(chunk);
      });

      file.on("error", (err) => {
        events.push({
          stage: "busboy_file_error",
          message: safeMsg(err?.message || err),
          ts: new Date().toISOString(),
        });
      });
    });

    busboy.on("error", (err) => {
      console.error("[ModuleIntegrator] Busboy error", err);
      clearTimeout(hardTimeout);
      if (!responseSent) {
        res.status(400).json({
          ok: false,
          error: "Multipart parsing failed",
          detail: err?.message,
          events: [
            ...events,
            {
              stage: "busboy_error",
              message: safeMsg(err?.message || err),
              ts: new Date().toISOString(),
            },
          ],
        });
        responseSent = true;
      }
    });

    busboy.on("finish", async () => {
      busboyFinished = true;

      if (!fileFound) {
        clearTimeout(hardTimeout);
        if (!responseSent) {
          res.status(400).json({ ok: false, error: "No PDF uploaded", events });
          responseSent = true;
        }
        return;
      }

      const pdfBuffer = Buffer.concat(pdfChunks);

      events.push({
        stage: "busboy_complete",
        message: `Parsed ${pdfBuffer.length} bytes`,
        ts: new Date().toISOString(),
      });

      const jobId = randomUUID();

      // 1) Create ingestion job row
      try {
        await query(
          `
          INSERT INTO ingestion_jobs (
            id,
            status,
            progress,
            current_stage
          )
          VALUES ($1, $2, $3, $4)
          `,
          [jobId, "queued", 0, "Queued"]
        );
      } catch (err) {
        clearTimeout(hardTimeout);
        if (!responseSent) {
          res.status(500).json({
            ok: false,
            error: "Failed to create ingestion job",
            detail: err?.message,
            events,
          });
          responseSent = true;
        }
        return;
      }

      // 2) Respond immediately (client begins polling)
      clearTimeout(hardTimeout);
      if (!responseSent) {
        res.status(202).json({
          ok: true,
          jobId,
          events,
        });
        responseSent = true;
      }

      // 3) Background ingestion
      setImmediate(async () => {
        // Watchdog for “job stuck at 10% forever”
        const BG_WATCHDOG_MS = 5 * 60 * 1000; // 5 minutes
        let watchdogFired = false;
        const watchdog = setTimeout(async () => {
          watchdogFired = true;
          try {
            await jobUpdate(jobId, {
              status: "failed",
              progress: 0,
              current_stage: "Watchdog timeout (background worker stalled)",
            });
          } catch (e) {
            console.error("[ModuleIntegrator] Watchdog failed", e);
          }
        }, BG_WATCHDOG_MS);

        const fail = async (stage, err) => {
          const msg = safeMsg(err?.message || err);
          console.error(`[ModuleIntegrator] ${stage}`, err);
          try {
            await jobUpdate(jobId, {
              status: "failed",
              progress: 0,
              current_stage: `${stage}: ${msg}`,
            });
          } catch (e) {
            console.error("[ModuleIntegrator] Failed to persist failure", e);
          }
        };

        try {
          await jobUpdate(jobId, {
            status: "running",
            progress: 10,
            current_stage: "PDF parsing",
          });

          // ✅ REAL PDF TEXT EXTRACTION
          let parsed;
          try {
            parsed = await pdfParse(pdfBuffer);
          } catch (e) {
            await fail("PDF parse failed", e);
            clearTimeout(watchdog);
            return;
          }

          const pdfText = parsed?.text ?? "";
          if (!pdfText.trim()) {
            await fail("PDF parse produced empty text", "No text extracted");
            clearTimeout(watchdog);
            return;
          }

          await jobUpdate(jobId, {
            progress: 25,
            current_stage: "Text extracted",
          });

          // ✅ Orchestrator call with richer event persistence
          const result = await ingestAdventureCodex({
            pdfText,
            adminUserId: userId,
            onEvent: async (e) => {
              try {
                const p = stageToProgress(e?.stage);
                const stageLabel = e?.stage ?? "event";

                // If orchestrator emits "error", persist the message
                if (stageLabel === "error") {
                  const emsg =
                    e?.meta?.message || e?.message || "Unknown orchestrator error";
                  await jobUpdate(jobId, {
                    status: "failed",
                    progress: 0,
                    current_stage: `orchestrator error: ${safeMsg(emsg)}`,
                  });
                  return;
                }

                await jobUpdate(jobId, {
                  progress: p ?? undefined,
                  current_stage: stageLabel,
                });
              } catch (err) {
                console.error("[IngestionJob] Failed to persist event", err);
              }
            },
          });

          // If watchdog already fired, don’t overwrite the row with “completed”
          if (watchdogFired) {
            clearTimeout(watchdog);
            return;
          }

          await jobUpdate(jobId, {
            status: result?.success ? "completed" : "failed",
            progress: result?.success ? 100 : 0,
            current_stage: result?.success ? "Completed" : "Failed",
          });

          clearTimeout(watchdog);
        } catch (err) {
          await fail("Unhandled error", err);
          clearTimeout(watchdog);
        }
      });
    });

    req.pipe(busboy);

    req.on("aborted", () => {
      console.warn("[ModuleIntegrator] Request aborted by client");
    });

    req.on("error", (err) => {
      console.warn("[ModuleIntegrator] Request stream error", err);
    });

    req.on("close", () => {
      if (!busboyFinished && !responseSent) {
        console.warn("[ModuleIntegrator] Request closed early");
      }
    });
  } catch (err) {
    clearTimeout(hardTimeout);
    if (!responseSent) {
      res.status(500).json({
        ok: false,
        error: "Unhandled module-integrator error",
        detail: err?.message,
      });
      responseSent = true;
    }
  }
}
