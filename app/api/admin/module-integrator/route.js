import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { userId } = await getTenantContext(req);

    const body = await req.json();
    const { pdfText } = body;

    if (!pdfText || typeof pdfText !== "string") {
      return new Response(
        JSON.stringify({ error: "pdfText is required" }),
        { status: 400 }
      );
    }

    const events = [];

    const result = await ingestAdventureCodex({
      pdfText,
      adminUserId: userId,
      onEvent: (e) => events.push(e),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        campaignId: result.campaignId,
        events,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err?.message || "Server error",
      }),
      { status: 500 }
    );
  }
}
