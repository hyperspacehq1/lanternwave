import Busboy from "busboy";
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

    console.error("[ModuleIntegrator] HARD TIMEOUT before job creation");
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
    const tenantId = ctx.tenantId;
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

      const jobId = randomUUID();

      try {
        await query(
          `
          INSERT INTO ingestion_jobs (
            id,
            tenant_id,
            status,
            progress,
            current_stage,
            created_at,
            updated_at
          )
          VALUES ($1,$2,'queued',0,'Queued',NOW(),NOW())
          `,
          [jobId, tenantId]
        );
      } catch (e) {
        clearTimeout(hardTimeout);
        console.error("JOB INSERT FAILED", e);
        if (!responseSent) {
          res.status(500).json({
            ok: false,
            error: "Failed to create ingestion job",
            detail: e.message,
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

      setImmediate(async () => {
        try {
          await query(
            `
            UPDATE ingestion_jobs
               SET status='running',
                   progress=10,
                   current_stage='PDF parsed',
                   updated_at=NOW()
             WHERE id=$1 AND tenant_id=$2
            `,
            [jobId, tenantId]
          );

          const result = await ingestAdventureCodex({
            pdfText: "deferred",
            adminUserId: userId,
            onEvent: async (e) => {
              await query(
                `
                UPDATE ingestion_jobs
                   SET current_stage=$3,
                       updated_at=NOW()
                 WHERE id=$1 AND tenant_id=$2
                `,
                [jobId, tenantId, e.stage]
              );
            },
          });

          await query(
            `
            UPDATE ingestion_jobs
               SET status=$3,
                   progress=$4,
                   current_stage=$5,
                   updated_at=NOW()
             WHERE id=$1 AND tenant_id=$2
            `,
            [
              jobId,
              tenantId,
              result.success ? "completed" : "failed",
              result.success ? 100 : 0,
              result.success ? "Completed" : "Failed",
            ]
          );
        } catch (err) {
          console.error("BACKGROUND INGEST ERROR", err);
          await query(
            `
            UPDATE ingestion_jobs
               SET status='failed',
                   current_stage='Unhandled error',
                   updated_at=NOW()
             WHERE id=$1 AND tenant_id=$2
            `,
            [jobId, tenantId]
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
    console.error("HANDLER ERROR", err);
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
