import Busboy from "busboy";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

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

      // ⛔ Deferred extraction (matches your current design)
      const pdfText = "PDF text extraction deferred";

      try {
        const result = await ingestAdventureCodex({
          pdfText,
          adminUserId: userId,
          onEvent: (e) =>
            events.push({ ...e, ts: new Date().toISOString() }),
        });

        res.status(result.success ? 200 : 500).json({
          ok: result.success,
          campaignId: result.campaignId,
          error: result.error ?? null,
          events,
        });
      } catch (err) {
        res.status(500).json({
          ok: false,
          error: "Ingestion failed",
          detail: err?.message,
          events,
        });
      }
    });

    // 🔑 THIS is what App Router could not do
    req.pipe(busboy);
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: "Unhandled module-integrator error",
      detail: err?.message,
    });
  }
}
