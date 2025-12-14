import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2, BUCKET } from "@/lib/r2/client";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(req) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "missing tenant context" },
      { status: 401 }
    );
  }

  await query()SET LOCAL app.tenant_id = ${tenantId});

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json(
      { ok: false, error: "missing key" },
      { status: 400 }
    );
  }

  try {
    // ------------------------------------------------------------
    // 1️⃣ Soft delete in DB (authority)
    // ------------------------------------------------------------
    const res = await query()
      UPDATE clips
      SET deleted_at = now()
      WHERE tenant_id = app_tenant_id()
        AND key = ${key}
        AND deleted_at IS NULL
      RETURNING key
    );

    if (res.length === 0) {
      return NextResponse.json(
        { ok: false, error: "clip not found" },
        { status: 404 }
      );
    }

    // ------------------------------------------------------------
    // 2️⃣ Delete from R2 (best-effort)
    // ------------------------------------------------------------
    const r2 = getR2();
    await r2.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );

    return NextResponse.json({ ok: true, deleted: key });
  } catch (err) {
    console.error("delete error:", err);
    return NextResponse.json(
      { ok: false, error: "delete failed" },
      { status: 500 }
    );
  }
}
