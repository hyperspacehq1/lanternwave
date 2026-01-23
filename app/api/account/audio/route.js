import { NextResponse } from "next/server";

console.log("[account-audio] MODULE LOADED");

import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req) {
  console.log("[account-audio][PUT] ENTRY");

  // ---- Step 1: read body safely
  let bodyText;
  try {
    bodyText = await req.text();
    console.log("[account-audio][PUT] raw body:", bodyText);
  } catch (e) {
    console.error("[account-audio][PUT] FAILED TO READ BODY", e);
    return NextResponse.json({ ok: false, step: "read-body" }, { status: 500 });
  }

  let body;
  try {
    body = JSON.parse(bodyText);
    console.log("[account-audio][PUT] parsed body:", body);
  } catch (e) {
    console.error("[account-audio][PUT] JSON PARSE ERROR", e);
    return NextResponse.json({ ok: false, step: "parse-json" }, { status: 400 });
  }

  const { key, value } = body || {};
  console.log("[account-audio][PUT] key/value:", key, value, typeof value);

  // ---- Step 2: tenant context
  let ctx;
  try {
    ctx = await getTenantContext(req);
    console.log("[account-audio][PUT] ctx:", ctx);
  } catch (e) {
    console.error("[account-audio][PUT] getTenantContext CRASH", e);
    return NextResponse.json(
      { ok: false, step: "tenant-context" },
      { status: 500 }
    );
  }

  if (!ctx?.tenantId) {
    console.error("[account-audio][PUT] NO TENANT");
    return NextResponse.json({ ok: false, step: "no-tenant" }, { status: 401 });
  }

  // ---- Step 3: SQL execution
  try {
    console.log("[account-audio][PUT] BEFORE SQL");

    const result = await query(
      `
      UPDATE account_preferences
     SET audio =
       COALESCE(audio, '{}'::jsonb)
       || jsonb_build_object($1::text, to_jsonb($2)),
         updated_at = NOW()
   WHERE tenant_id = $3
  `,
  [key, value, ctx.tenantId]
);

    console.log("[account-audio][PUT] SQL RESULT:", result);

    return NextResponse.json({
      ok: true,
      debug: {
        rowCount: result.rowCount,
        rows: result.rows,
      },
    });
  } catch (e) {
    console.error("[account-audio][PUT] SQL CRASH", e);
    return NextResponse.json(
      {
        ok: false,
        step: "sql",
        message: e.message,
        code: e.code,
      },
      { status: 500 }
    );
  }
}
