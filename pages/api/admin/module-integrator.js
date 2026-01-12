import Busboy from "busboy";
import { randomUUID } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import OpenAI from "openai";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";

export const config = {
  api: { bodyParser: false },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function log(stage, extra = {}) {
  console.log(`[module-integrator] ${stage}`, extra);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // ─────────────────────────────────────────────
  // Auth
  // ─────────────────────────────────────────────
  try {
    await getTenantContext(req);
  } catch {
    return res.status(401).json({ ok: false, error: "Auth failed" });
  }

  const jobId = randomUUID();

  await query(
    `
    INSERT INTO ingestion_jobs (id, status, progress, current_stage)
    VALUES ($1, 'running', 0, 'Job created')
    `,
    [jobId]
  );

  // ─────────────────────────────────────────────
  // Streaming setup
  // ─────────────────────────────────────────────
  const BusboyFactory = Busboy?.default ?? Busboy;
  const busboy = BusboyFactory({ headers: req.headers });

  const tmpDir = os.tmpdir();
  const tempFilePath = path.join(tmpDir, `${jobId}.pdf`);

  let fileSeen = false;

  busboy.on("file", (fieldname, file) => {
    if (fieldname !== "file") {
      file.resume();
      return;
    }

    fileSeen = true;
    const writeStream = fs.createWriteStream(tempFilePath);
    file.pipe(writeStream);

    writeStream.on("finish", () => {
      log("file_written", { tempFilePath });
    });
  });

  busboy.on("finish", async () => {
    if (!fileSeen) {
      await query(
        `UPDATE ingestion_jobs SET status='failed', current_stage=$2 WHERE id=$1`,
        [jobId, "No file uploaded"]
      );
      return;
    }

    try {
      // ─────────────────────────────────────────────
      // STREAM FILE TO OPENAI (NO BUFFERS)
      // ─────────────────────────────────────────────
      const openaiFile = await openai.files.create({
        file: fs.createReadStream(tempFilePath),
        purpose: "assistants",
      });

      await query(
        `UPDATE ingestion_jobs SET progress=$2, current_stage=$3 WHERE id=$1`,
        [jobId, 25, "PDF uploaded to OpenAI"]
      );

      // Save file_id for downstream orchestrator
      await query(
        `
        UPDATE ingestion_jobs
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'),
          '{openai_file_id}',
          to_jsonb($2::text)
        )
        WHERE id = $1
        `,
        [jobId, openaiFile.id]
      );

      // ─────────────────────────────────────────────
      // DEBUG STOP (INTENTIONAL)
      // ─────────────────────────────────────────────
      await query(
        `UPDATE ingestion_jobs SET progress=$2, current_stage=$3 WHERE id=$1`,
        [jobId, 40, "Debug stop: PDF uploaded"]
      );
    } catch (err) {
      await query(
        `UPDATE ingestion_jobs SET status='failed', current_stage=$2 WHERE id=$1`,
        [jobId, `PDF ingest failed: ${err.message}`]
      );
    } finally {
      fs.unlink(tempFilePath, () => {});
    }
  });

  busboy.on("error", async (err) => {
    await query(
      `UPDATE ingestion_jobs SET status='failed', current_stage=$2 WHERE id=$1`,
      [jobId, `Busboy error: ${err.message}`]
    );
  });

  req.pipe(busboy);

  return res.status(202).json({
    ok: true,
    jobId,
  });
}
