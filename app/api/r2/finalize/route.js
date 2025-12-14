import { NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getR2, BUCKET } from "@/lib/r2/client";
import { sql } from "@/lib/db";
import { guessContentType } from "@/lib/r2/contentType";

export const runtime = "nodejs";

export async function POST(req) {
  const tenantId = req.headers.get("x-tenant-id");
  const userId = req.headers.get("x-user-id");

  if (!tenantId || !userId) {
    return NextResponse.json(
      { ok: false, error: "missing tenant or user context" },
      { status: 401 }
    );
  }

  await sql`SET LOCAL app.tenant_id = ${tenantId}`;
  await sql`SET LOCAL app.user_id = ${userId}`;

  try {
    const { key } = await req.json();
    if (!key) {
      return NextResponse.json(
        { ok: false, error: "missing key" },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // 1️⃣ Verify object exists in R2
    // ------------------------------------------------------------
    const r2 = getR2();
    const head = await r2.send(
      new HeadObjectCommand({ Bucket: BUCKET, Key: key })
    );

    // ------------------------------------------------------------
    // 2️⃣ Insert clip metadata (authoritative)
    // ------------------------------------------------------------
    await sql`
      INSERT INTO clips (
        tenant_id,
        user_id,
        bucket_id,
        key,
        mime_type,
        byte_size
      )
      VALUES (
        app_tenant_id(),
        app_user_id(),
        (
          SELECT id
          FROM r2_buckets
          WHERE tenant_id = app_tenant_id()
            AND user_id = app_user_id()
          LIMIT 1
        ),
        ${key},
        ${guessContentType(key)},
        ${head.ContentLength || null}
      )
      ON CONFLICT DO NOTHING
    `;

    return NextResponse.json({ ok: true, key });
  } catch (err) {
    console.error("finalize error:", err);
    return NextResponse.json(
      { ok: false, error: "finalize failed" },
      { status: 500 }
    );
  }
}
