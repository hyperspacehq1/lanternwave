import Busboy from "busboy";
import pdfParse from "pdf-parse";
import { randomUUID } from "crypto";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";

export const config = {
  api: { bodyParser: false },
};

function log(stage, extra = {}) {
  console.log(`[module-integrator] ${stage}`, extra);
}

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

  // Create job row EARLY so UI can poll even if parsing fails
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
    log("job_create_failed", { message: err?.message });
    return res.status(500).json({
      ok: false,
      error: "Failed to create ingestion job",
      detail: err?.message,
    });
  }

  const events = [
    { stage: "job_created", message: "Job row inserted" },
  ];

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
    events.push({
      stage: "busboy_file_detected",
      message: info?.filename ?? "unknown",
    });

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

    events.push({
      stage: "busboy_complete",
      message: `Read ${totalBytes} bytes`,
    });

    let pdfText = "";
    try {
      const parsed = await pdfParse(Buffer.concat(fileBufferChunks));
      pdfText = parsed?.text ?? "";

      log("pdf_parsed", { textLength: pdfText.length });

      await query(
        `UPDATE ingestion_jobs SET progress=$2, current_stage=$3 WHERE id=$1`,
        [jobId, 25, "PDF parsed"]
      );
    } catch (err) {
      log("pdf_parse_failed", { message: err?.message });

      await query(
        `UPDATE ingestion_jobs SET status='failed', current_stage=$2 WHERE id=$1`,
        [jobId, `PDF parse failed: ${err?.message}`]
      );

      return;
    }

    if (!pdfText.trim()) {
      log("pdf_empty_text");

      await query(
        `UPDATE ingestion_jobs SET status='failed', current_stage=$2 WHERE id=$1`,
        [jobId, "PDF contained no extractable text"]
      );

      return;
    }

    // STOP HERE ON PURPOSE
    // We are not calling orchestrator yet.
    // This proves upload + parse + DB works.

    await query(
      `UPDATE ingestion_jobs SET progress=$2, current_stage=$3 WHERE id=$1`,
      [jobId, 40, "Debug stop: PDF text extracted"]
    );

    log("debug_stop_reached");
  });

  busboy.on("error", async (err) => {
    log("busboy_error", { message: err?.message });

    await query(
      `UPDATE ingestion_jobs SET status='failed', current_stage=$2 WHERE id=$1`,
      [jobId, `Busboy error: ${err?.message}`]
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
