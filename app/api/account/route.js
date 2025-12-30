export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";

/**
 * GET — used by the frontend to verify route availability
 * Prevents 405 errors when the page loads.
 */
export async function GET() {
  return Response.json({
    ok: true,
    status: "ready",
  });
}

/**
 * POST — handles multipart file upload + ingestion
 */
export async function POST(req) {
  try {
    console.log("🚀 [account upload] Route invoked");

    const ctx = await getTenantContext(req);
    if (!ctx?.tenantId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized or missing tenant context" }),
        { status: 401 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Expected multipart/form-data" }),
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file received" }),
        { status: 400 }
      );
    }

    console.log("📄 Upload received:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await ingestAdventureCodex({
      buffer,
      tenantId: ctx.tenantId,
    });

    return Response.json({
      success: true,
      result,
    });
  } catch (err) {
    console.error("🔥 ACCOUNT ROUTE ERROR:", err);

    return new Response(
      JSON.stringify({
        error: err?.message || "Internal server error",
        stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
      }),
      { status: 500 }
    );
  }
}
