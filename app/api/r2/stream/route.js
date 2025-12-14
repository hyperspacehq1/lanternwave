import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getR2, BUCKET } from "@/lib/r2/client";
import { guessContentType } from "@/lib/r2/contentType";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json(
      { ok: false, error: "missing key" },
      { status: 400 }
    );
  }

  // ------------------------------------------------------------
  // 1️⃣ Resolve tenant (example pattern)
  // ------------------------------------------------------------
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "missing tenant context" },
      { status: 401 }
    );
  }

  // Enforce RLS
  await sql`SET LOCAL app.tenant_id = ${tenantId}`;

  try {
    // ------------------------------------------------------------
    // 2️⃣ Verify clip belongs to tenant (DB = source of truth)
    // ------------------------------------------------------------
    const [clip] = await sql`
      SELECT key
      FROM clips
      WHERE tenant_id = app_tenant_id()
        AND key = ${key}
        AND deleted_at IS NULL
      LIMIT 1
    `;

    if (!clip) {
      return NextResponse.json(
        { ok: false, error: "clip not found" },
        { status: 404 }
      );
    }

    // ------------------------------------------------------------
    // 3️⃣ Generate signed R2 URL (unchanged behavior)
    // ------------------------------------------------------------
    const r2 = getR2();
    const cmd = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentType: guessContentType(key),
    });

    const url = await g

