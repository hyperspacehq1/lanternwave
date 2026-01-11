import Busboy from "busboy";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    // 🔒 Tenant context FIRST (does not consume body)
    const ctx = await getTenantContext(req);
    const userId = ctx.userId;

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return Response.json(
        { ok: false, error: "Invalid content type" },
        { status: 400 }
      );
    }

    return await new Promise((resolve) => {
      const events = [];

      // 🔍 Transparency: busboy lifecycle
      events.push({
        stage: "busboy_init",
        message: "Initializing multipart stream",
        ts: new Date().toISOString(),
      });

      const busboy = Busboy({
        headers: Object.fromEntries(req.headers),
      });

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

        file.on("limit", () => {
          resolve(
            Response.json(
              {
                ok: false,
                error: "PDF exceeds allowed size",
                events,
              },
              { status: 413 }
            )
          );
        });
      });

      busboy.on("finish", async () => {
        if (!fileFound) {
          resolve(
            Response.json(
              {
                ok: false,
                error: "No PDF file uploaded",
                events,
              },
              { status: 400 }
            )
          );
          return;
        }

        const pdfBuffer = Buffer.concat(pdfChunks);

        events.push({
          stage: "busboy_complete",
          message: `Multipart parsing complete (${pdfBuffer.length} bytes)`,
          ts: new Date().toISOString(),
        });

        // ⛔ Intentionally deferred: actual PDF text extraction
        const pdfText = "PDF text extraction deferred";

        try {
          const result = await ingestAdventureCodex({
            pdfText,
            adminUserId: userId,
            onEvent: (e) =>
              events.push({ ...e, ts: new Date().toISOString() }),
          });

          resolve(
            Response.json(
              {
                ok: result.success,
                campaignId: result.campaignId,
                error: result.error ?? null,
                events,
              },
              { status: result.success ? 200 : 500 }
            )
          );
        } catch (err) {
          resolve(
            Response.json(
              {
                ok: false,
                error: "Ingestion failed",
                detail: err?.message,
                events,
              },
              { status: 500 }
            )
          );
        }
      });

      // 🔑 Stream request body directly into Busboy
      req.body.pipe(busboy);
    });
  } catch (err) {
    // 🔒 Absolute last line of defense
    return Response.json(
      {
        ok: false,
        error: "Unhandled module-integrator error",
        detail: err?.message,
      },
      { status: 500 }
    );
  }
}
