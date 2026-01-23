import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req) {
  console.log("[account-audio][PUT] HIT");

  try {
    const rawBody = await req.text();
    console.log("[account-audio][PUT] raw body:", rawBody);

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error("[account-audio][PUT] JSON parse failed:", e);
      return NextResponse.json(
        { ok: false, error: "invalid json" },
        { status: 400 }
      );
    }

    const { key, value } = body;
    console.log("[account-audio][PUT] parsed:", { key, value, type: typeof value });

    const ctx = await getTenantContext(req);
    console.log("[account-audio][PUT] ctx:", ctx);

    if (!ctx?.tenantId) {
      console.error("[account-audio][PUT] NO TENANT");
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    console.log("[account-audio][PUT] ABOUT TO QUERY");

    const result = await query(
      `
      UPDATE account_preferences
         SET audio =
           COALESCE(audio, '{}'::jsonb)
           || jsonb_build_object($1, $2),
             updated_at = NOW()
       WHERE tenant_id = $3
       RETURNING tenant_id, audio
      `,
      [key, value, ctx.tenantId]
    );

    console.log("[account-audio][PUT] QUERY RESULT:", result);

    return NextResponse.json({
      ok: true,
      debug: {
        rowCount: result.rowCount,
        rows: result.rows,
      },
    });
  } catch (err) {
    console.error("[account-audio][PUT] 💥 ERROR:", err);
    console.error("[account-audio][PUT] 💥 ERROR MESSAGE:", err?.message);
    console.error("[account-audio][PUT] 💥 ERROR STACK:", err?.stack);

    return NextResponse.json(
      {
        ok: false,
        error: "internal server error",
        debug: {
          message: err?.message,
          code: err?.code,
        },
      },
      { status: 500 }
    );
  }
}
