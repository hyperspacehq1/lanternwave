import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { userId } = await getTenantContext(req);

    // ✅ Expect JSON only
    const body = await req.json();
    const { pdfText } = body;

    if (!pdfText || typeof pdfText !== "string") {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "pdfText is required",
        }),
        { status: 400 }
      );
    }

    const events = [];

    const result = await ingestAdventureCodex({
      pdfText,
      adminUserId: userId,
      onEvent: (e) =>
        events.push({
          ...e,
          ts: new Date().toISOString(),
        }),
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
    return new Response(
      JSON.stringify({
        ok: false,
        error: err?.message || "Unhandled server error",
      }),
      { status: 500 }
    );
  }
}
