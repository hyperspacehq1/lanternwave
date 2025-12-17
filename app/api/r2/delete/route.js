import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { getTenantContext } from "@/lib/tenant/server";
import { db } from "@/lib/db"; // adjust if needed

export const runtime = "nodejs";

export async function DELETE(req) {
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
    // Resolve tenant
    // ------------------------------------------------------------
    const { tenantId, prefix } = getTenantContext();

    if (!tenantId || !prefix) {
      throw new Error("Tenant context missing");
    }

    // Enforce tenant isolation
    if (!key.startsWith(prefix + "/")) {
      return NextResponse.json(
        { ok: false, error: "invalid tenant key" },
        { status: 403 }
      );
    }

    // ------------------------------------------------------------
    // Soft delete DB record (source of truth)
    // ------------------------------------------------------------
    const { rowCount } = await db.query(
      `
      update clips
      set deleted_at = now()
      where tenant_id = $1
        and object_key = $2
        and deleted_at is null
      `,
      [tenantId, key]
    );

    // If nothing was updated, treat as idempotent success
    if (rowCount === 0) {
      return NextResponse.json({
        ok: true,
        deleted: key,
        alreadyDeleted: true,
      });
    }

    // ------------------------------------------------------------
    // Delete from R2 (best-effort)
    // ------------------------------------------------------------
    const client = getR2Client();

    await client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );

    return NextResponse.json({
      ok: true,
      deleted: key,
    });
  } catch (err) {
    console.error("[r2 delete]", err);
    return NextResponse.json(
      { ok: false, error: "delete failed" },
      { status: 500 }
    );
  }
}
