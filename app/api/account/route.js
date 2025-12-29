export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";

/**
 * GET — return authenticated account info
 */
export async function GET(req) {
  try {
    const ctx = await getTenantContext(req);

    if (!ctx?.user) {
      return Response.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    return Response.json({
      ok: true,
      account: {
        id: ctx.user.id,
        username: ctx.user.username,
        username_normalized: ctx.user.username_normalized,
        is_admin: ctx.user.is_admin,
      },
    });
  } catch (err) {
    console.error("🔥 ACCOUNT GET ERROR:", err);

    return new Response(
      JSON.stringify({
        ok: false,
        error: err?.message || "Internal server error",
      }),
      { status: 500 }
    );
  }
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
