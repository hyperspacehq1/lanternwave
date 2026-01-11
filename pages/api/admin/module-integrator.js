import Busboy from "busboy";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { db } from "@/lib/db"; // ← adjust import if your db helper is named differently
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

  try {
    // 🔒 Tenant context (safe in Pages Router)
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
      if (!fileFound) {
        res.status(400).json({
          ok: false,
          error: "No PDF file uploaded",
          events,
        });
        return;
      }

      const pdfBuffer = Buffer.concat(pdfChunks);

      events.push({
        stage: "busboy_complete",
        message: `Multipart parsing complete (${pdfBuffer.length} bytes)`,
        ts: new Date().toISOString(),
      });

      /* ============================================================
         BACKGROUND INGESTION — PATH B
      ============================================================ */

      const jobId = randomUUID();

      // 1️⃣ Create ingestion job (queued)
      await db.query(
        `
        insert into ingestion_jobs (
          id,
          status,
          progress,
          current_stage,
          created_at,
          updated_at
        )
        values ($1, 'queued', 0, 'Queued', now(), now())
        `,
        [jobId]
      );

      // 2️⃣ Respond immediately (no timeout)
      res.status(202).json({
        ok: true,
        jobId,
        events,
      });

      // 3️⃣ Continue ingestion in background
      setImmediate(async () => {
        try {
          await db.query(
            `
            update ingestion_jobs
            set status = 'running',
                progress = 10,
                current_stage = 'PDF parsed',
                updated_at = now()
            where id = $1
            `,
            [jobId]
          );

          // ⛔ Deferred extraction preserved (no regression)
          const pdfText = "PDF text extraction deferred";

          const result = await ingestAdventureCodex({
            pdfText,
            adminUserId: userId,
            onEvent: async (e) => {
              // schema-level transparency preserved
              await db.query(
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
            await db.query(
              `
              update ingestion_jobs
              set status = 'completed',
                  progress = 100,
                  current_stage = 'Completed',
                  updated_at = now()
              where id = $1
              `,
              [jobId]
            );
          } else {
            await db.query(
              `
              update ingestion_jobs
              set status = 'failed',
                  current_stage = 'Failed',
                  updated_at = now()
              where id = $1
              `,
              [jobId]
            );
          }
        } catch (err) {
          await db.query(
            `
            update ingestion_jobs
            set status = 'failed',
                current_stage = 'Unhandled error',
                updated_at = now()
            where id = $1
            `,
            [jobId]
          );
        }
      });
    });

    // 🔑 Pages Router allows true Node streaming
    req.pipe(busboy);
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: "Unhandled module-integrator error",
      detail: err?.message,
    });
  }
}

