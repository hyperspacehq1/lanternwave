import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const ctx = await getTenantContext(req); // should include userId + tenantId
    const { userId } = ctx;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
      });
    }

    // Read file to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // ✅ IMPORTANT: import your PDF text extractor (use your real function name/path)
    // If your extractor is different, tell me the exact path + export name and I’ll adapt.
    const { extractTextFromPdf } = await import("@/lib/ai/extractTextFromPdf");

    const pdfText = await extractTextFromPdf(buffer);

    const { ingestAdventureCodex } = await import("@/lib/ai/orchestrator");

    const events = [];
    const result = await ingestAdventureCodex({
      pdfText,
      adminUserId: userId,
      onEvent: (e) => events.push(e),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        templateCampaignId: result?.templateCampaignId ?? null,
        campaignId: result?.campaignId ?? null,
        events,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err?.message || "Unhandled server error",
      }),
      { status: 500 }
    );
  }
}
