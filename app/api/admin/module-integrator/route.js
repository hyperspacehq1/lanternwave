import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import pdfParse from "pdf-parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { userId } = await getTenantContext(req);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return new Response(
        JSON.stringify({ ok: false, error: "No PDF file uploaded" }),
        { status: 400 }
      );
    }

    // Read PDF into buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract text from PDF
    const parsed = await pdfParse(buffer);
    const pdfText = parsed.text;

    if (!pdfText || !pdfText.trim()) {
      return new Response(
        JSON.stringify({ ok: false, error: "PDF contains no extractable text" }),
        { status: 400 }
      );
    }

    const events = [];

    const result = await ingestAdventureCodex({
      pdfText,
      adminUserId: userId,
      onEvent: (e) => {
        events.push({
          ...e,
          ts: new Date().toISOString(),
        });
      },
    });

    return new Response(
      JSON.stringify({
        ok: result.success,
        campaignId: result.campaignId,
        error: result.error ?? null,
        events,
      }),
      { status: result.success ? 200 : 500 }
    );
  } catch (err) {
    // ABSOLUTE GUARANTEE: JSON ONLY
    return new Response(
      JSON.stringify({
        ok: false,
        error: err?.message || "Unhandled server error",
      }),
      { status: 500 }
    );
  }
}
