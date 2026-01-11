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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  let responseSent = false;

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
        message: info.filename,
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
          res.status(400).json({ ok: false, error: "No PDF uploaded" });
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

      // 🔹 Create ingestion job
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
            detail: err.message,
          });
          responseSent = true;
        }
        return;
      }

      clearTimeout(hardTimeout);
      if (!responseSent) {
        res.status(202).json({
          ok: true,
          jobId,
          events,
        });
        responseSent = true;
      }

      // ============================================================
      // 🔥 REAL PDF INGESTION STARTS HERE
      // ============================================================

      setImmediate(async () => {
        try {
          await query(
            `
            UPDATE ingestion_jobs
               SET status='running',
                   progress=10,
                   current_stage='PDF parsing',
                   updated_at=NOW()
             WHERE id=$1
            `,
            [jobId]
          );

          // ✅ REAL PDF TEXT EXTRACTION
          const parsed = await pdfParse(pdfBuffer);
          const pdfText = parsed.text;

          await query(
            `
            UPDATE ingestion_jobs
               SET progress=25,
                   current_stage='Text extracted',
                   updated_at=NOW()
             WHERE id=$1
            `,
            [jobId]
          );

          // 🔥 Pass REAL text into orchestrator
          const result = await ingestAdventureCodex({
            pdfText,
            adminUserId: userId,
            onEvent: async (e) => {
              await query(
                `
                UPDATE ingestion_jobs
                   SET current_stage=$2,
                       updated_at=NOW()
                 WHERE id=$1
                `,
                [jobId, e.stage]
              );
            },
          });

          await query(
            `
            UPDATE ingestion_jobs
               SET status=$2,
                   progress=$3,
                   current_stage=$4,
                   updated_at=NOW()
             WHERE id=$1
            `,
            [
              jobId,
              result.success ? "completed" : "failed",
              result.success ? 100 : 0,
              result.success ? "Completed" : "Failed",
            ]
          );
        } catch (err) {
          console.error("[ModuleIntegrator] Background error", err);

          await query(
            `
            UPDATE ingestion_jobs
               SET status='failed',
                   current_stage='Unhandled error',
                   updated_at=NOW()
             WHERE id=$1
            `,
            [jobId]
          );
        }
      });
    });

    req.pipe(busboy);

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
        detail: err.message,
      });
      responseSent = true;
    }
  }
}
