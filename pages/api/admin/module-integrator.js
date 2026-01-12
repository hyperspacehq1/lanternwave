import Busboy from "busboy";
import { randomUUID } from "crypto";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

export const config = {
  api: { bodyParser: false },
};

function log(stage, extra = {}) {
  console.log(`[module-integrator] ${stage}`, extra);
}

/* ---------------- PDF TEXT EXTRACTION ---------------- */

async function extractPdfText(buffer) {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;

  let text = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    text += strings.join(" ") + "\n";
  }

  return text;
}

/* ---------------- API HANDLER ---------------- */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  log("request_received");

  let ctx;
  try {
    ctx = await getTenantContext(req);
    log("tenant_context_ok", { userId: ctx.userId });
  } catch (err) {
    log("tenant_context_failed", { message: err?.message });
    return res.status(401).json({
      ok: false,
      error: "Auth failed",
      detail: err?.message,
    });
  }

  const jobId = randomUUID();

  // Create job row early so UI can poll
  try {
    await query(
      `
      INSERT INTO ingestion_jobs (id, status, progress, current_stage)
      VALUES ($1, $2, $3, $4)
      `,
      [jobId, "running", 0, "Job created"]
    );
    log("job_created", { jobId });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "Failed to create ingestion job",
    });
  }

  const events = [{ stage: "job_created", message: "Job row inserted" }];

  const BusboyFactory = Busboy?.default ?? Busboy;
  const busboy = BusboyFactory({ headers: req.headers });

  let fileBufferChunks = [];
  let totalBytes = 0;
  let fileSeen = false;

  busboy.on("file", (fieldname, file, info) => {
    if (fieldname !== "file") {
      file.resume();
      return;
    }

    fileSeen = true;
    log("busboy_file_detected", { filename: info?.filename });

    file.on("data", (chunk) => {
      totalBytes += chunk.length;
      fileBufferChunks.push(chunk);
    });

    file.on("error", (err) => {
      log("busboy_file_error", { message: err?.message });
    });
  });

  busboy.on("finish", async () => {
    log("busboy_finish", { totalBytes });

    if (!fileSeen) {
      await query(
        `UPDATE ingestion_jobs SET status='failed', current_stage=$2 WHERE id=$1`,
        [jobId, "No file uploaded"]
      );
      return;
    }

    let pdfText = "";

    try {
      pdfText = await extractPdfText(Buffer.concat(fileBufferChunks));

      log("pdf_parsed", { textLength: pdfText.length });

      await query(
        `UPDATE ingestion_jobs SET progress=$2, current_stage=$3 WHERE id=$1`,
        [jobId, 25, "PDF parsed"]
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

    // 🔴 DEBUG STOP ON PURPOSE
    await query(
      `UPDATE ingestion_jobs SET progress=$2, current_stage=$3 WHERE id=$1`,
      [jobId, 40, "Debug stop: PDF text extracted"]
    );

    log("debug_stop_reached");
  });

  busboy.on("error", async (err) => {
    await query(
      `UPDATE ingestion_jobs SET status='failed', current_stage=$2 WHERE id=$1`,
      [jobId, `Busboy error: ${err.message}`]
    );
  });

  req.pipe(busboy);

  // Respond immediately so UI can poll
  return res.status(202).json({
    ok: true,
    jobId,
    events,
  });
}
