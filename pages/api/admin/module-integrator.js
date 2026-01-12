import Busboy from "busboy";
import { randomUUID } from "crypto";
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

/* ---------------- OPENAI PDF EXTRACTION ---------------- */

async function extractPdfTextWithOpenAI(buffer) {
  const file = await openai.files.create({
    file: buffer,
    purpose: "assistants",
  });

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: "Extract all text from this PDF." },
          { type: "input_file", file_id: file.id },
        ],
      },
    ],
  });

  return response.output_text ?? "";
}

/* ---------------- API HANDLER ---------------- */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Auth failed" });
  }

  const jobId = randomUUID();

  await query(
    `
    INSERT INTO ingestion_jobs (id, status, progress, current_stage)
    VALUES ($1, $2, $3, $4)
    `,
    [jobId, "running", 0, "Job created"]
  );

  const BusboyFactory = Busboy?.default ?? Busboy;
  const busboy = BusboyFactory({ headers: req.headers });

  let fileBufferChunks = [];
  let fileSeen = false;

  busboy.on("file", (fieldname, file) => {
    if (fieldname !== "file") {
      file.resume();
      return;
    }

    fileSeen = true;

    file.on("data", (chunk) => {
      fileBufferChunks.push(chunk);
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

    let pdfText = "";

    try {
      const buffer = Buffer.concat(fileBufferChunks);

      pdfText = await extractPdfTextWithOpenAI(buffer);

      await query(
        `UPDATE ingestion_jobs SET progress=$2, current_stage=$3 WHERE id=$1`,
        [jobId, 25, "PDF text extracted"]
      );
    } catch (err) {
      await query(
        `UPDATE ingestion_jobs SET status='failed', current_stage=$2 WHERE id=$1`,
        [jobId, `PDF parse failed: ${err.message}`]
      );
      return;
    }

    if (!pdfText.trim()) {
      await query(
        `UPDATE ingestion_jobs SET status='failed', current_stage=$2 WHERE id=$1`,
        [jobId, "PDF contained no extractable text"]
      );
      return;
    }

    // 🔴 DEBUG STOP — INTENTIONAL
    await query(
      `UPDATE ingestion_jobs SET progress=$2, current_stage=$3 WHERE id=$1`,
      [jobId, 40, "Debug stop: PDF text extracted"]
    );
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
