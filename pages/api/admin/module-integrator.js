import Busboy from "busboy";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { ident } from "@/lib/db";
import { randomUUID } from "crypto";

export const config = {
  api: {
    bodyParser: false, // 🔑 REQUIRED for Busboy
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  // ============================================================
  // WATCHDOGS (ADDITIVE)
  // ============================================================

  let responseSent = false;

  const HARD_TIMEOUT_MS = 15000; // 15s to reach job creation
  const hardTimeout = setTimeout(() => {
    if (responseSent) return;

    console.error("[ModuleIntegrator] HARD TIMEOUT before job creation");

    try {
      res.status(504).json({
        ok: false,
        error: "Server did not reach job creation",
        detail:
          "Upload reached server but multipart parsing or job creation did not complete.",
      });
      responseSent = true;
    } catch {
      // response may already be in bad state
    }
  }, HARD_TIMEOUT_MS);

  try {
    // 🔒 Auth guard (do NOT assume tenant_id exists on ingestion_jobs)
    const ctx = await getTenantContext(req);
    const userId = ctx.userId;

    const events = [];

    events.push({
      stage: "busboy_init",
      message: "Initializing multipart stream",
      ts: new Date().toISOString(),
    });

    const busboy = Busboy({ headers: req.headers });

    let pdfChunks = [];
    let fileFound = false;
    let busboyFinished = false;

    busboy.on("file", (fieldname, file, info) => {
      if (fieldname !== "file") {
        file.resume();
        return;
      }

      fileFound = true;

      events.push({
        stage: "busboy_file_detected",
        message: `PDF stream detected (${info.filename})`,
        ts: new Date().toISOString(),
      });

      file.on("data", (chunk) => {
        pdfChunks.push(chunk);
      });
    });

    busboy.on("finish", async () => {
      busboyFinished = true;

      if (!fileFound) {
        clearTimeout(hardTimeout);
        if (!responseSent) {
          res.status(400).json({
            ok: false,
            error: "No PDF file uploaded",
            events,
          });
          responseSent = true;
        }
        return;
      }

      const pdfBuffer = Buffer.concat(pdfChunks);

      events.push({
        stage: "busboy_complete",
        message: `Multipart parsing complete (${pdfBuffer.length} bytes)`,
        ts: new Date().toISOString(),
      });

      /* ============================================================
         BACKGROUND INGESTION — PATH B (UNCHANGED)
      ============================================================ */

      const jobId = randomUUID();

      try {
        // ✅ Minimal insert that matches your actual table shape
        // id is required; created_at/updated_at default now()
        // status/progress/current_stage are nullable per DB export
        await ident.query(
          `
          insert into ingestion_jobs (
            id,
            status,
            progress,
            current_stage
          )
          values ($1, $2, $3, $4)
          `,
          [jobId, "queued", 0, "Queued"]
        );
      } catch (dbErr) {
        clearTimeout(hardTimeout);

        console.error("[ModuleIntegrator] Failed to create job row", dbErr);

        // ✅ Surface real Postgres info to UI (this is the fastest way to diagnose)
        if (!responseSent) {
          res.status(500).json({
            ok: false,
            error: "Failed to create ingestion job",
            detail: dbErr?.message,
            pg: {
              code: dbErr?.code,
              detail: dbErr?.detail,
              hint: dbErr?.hint,
              constraint: dbErr?.constraint,
              table: dbErr?.table,
              column: dbErr?.column,
              schema: dbErr?.schema,
              routine: dbErr?.routine,
            },
          });
          responseSent = true;
        }
        return;
      }

      // 2️⃣ Respond immediately (no timeout)
      clearTimeout(hardTimeout);
      if (!responseSent) {
        res.status(202).json({
          ok: true,
          jobId,
          events,
        });
        responseSent = true;
      }

      // 3️⃣ Continue ingestion in background (UNCHANGED)
      setImmediate(async () => {
        try {
          await ident.query(
            `
            update ingestion_jobs
            set status = $2,
                progress = $3,
                current_stage = $4,
                updated_at = now()
            where id = $1
            `,
            [jobId, "running", 10, "PDF parsed"]
          );

          // ⛔ Deferred extraction preserved (no regression)
          const pdfText = "PDF text extraction deferred";

          const result = await ingestAdventureCodex({
            pdfText,
            adminUserId: userId,
            onEvent: async (e) => {
              // schema-level transparency preserved
              await ident.query(
                `
                update ingestion_jobs
                set current_stage = $2,
                    updated_at = now()
                where id = $1
                `,
                [jobId, e.stage]
              );
            },
          });

          if (result.success) {
            await ident.query(
              `
              update ingestion_jobs
              set status = $2,
                  progress = $3,
                  current_stage = $4,
                  updated_at = now()
              where id = $1
              `,
              [jobId, "completed", 100, "Completed"]
            );
          } else {
            await ident.query(
              `
              update ingestion_jobs
              set status = $2,
                  current_stage = $3,
                  updated_at = now()
              where id = $1
              `,
              [jobId, "failed", "Failed"]
            );
          }
        } catch (err) {
          console.error("[ModuleIntegrator] Background ingestion error", err);

          try {
            await ident.query(
              `
              update ingestion_jobs
              set status = $2,
                  current_stage = $3,
                  updated_at = now()
              where id = $1
              `,
              [jobId, "failed", "Unhandled error"]
            );
          } catch (e2) {
            console.error(
              "[ModuleIntegrator] Failed to mark job failed",
              e2
            );
          }
        }
      });
    });

    // 🔑 Pages Router allows true Node streaming
    req.pipe(busboy);

    req.on("aborted", () => {
      console.warn("[ModuleIntegrator] Request aborted by client");
    });

    req.on("close", () => {
      if (!busboyFinished && !responseSent) {
        console.warn("[ModuleIntegrator] Request closed before Busboy finished");
      }
    });
  } catch (err) {
    clearTimeout(hardTimeout);

    console.error("[ModuleIntegrator] Unhandled handler error", err);

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
