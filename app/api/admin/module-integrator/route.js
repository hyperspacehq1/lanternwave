import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    let formData;
    let file;
    let userId;

    try {
      // 🔒 isolate all early framework calls
      const ctx = await getTenantContext(req);
      userId = ctx.userId;

      formData = await req.formData();
      file = formData.get("file");
    } catch (e) {
      return Response.json(
        {
          ok: false,
          error: "Failed to read request data",
          detail: e?.message,
        },
        { status: 400 }
      );
    }

    if (!file) {
      return Response.json(
        { ok: false, error: "No PDF file uploaded" },
        { status: 400 }
      );
    }

    // ⛔ TEMPORARY: we are NOT parsing PDF server-side
    // This prevents build/runtime issues
    const pdfText = "PDF text extraction deferred";

    const events = [];

    const result = await ingestAdventureCodex({
      pdfText,
      adminUserId: userId,
      onEvent: (e) => events.push({ ...e, ts: new Date().toISOString() }),
    });

    return Response.json(
      {
        ok: result.success,
        campaignId: result.campaignId,
        error: result.error ?? null,
        events,
      },
      { status: result.success ? 200 : 500 }
    );
  } catch (err) {
    // 🔒 absolute last line of defense
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
