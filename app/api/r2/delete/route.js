import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { ok: false, error: "missing key" },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // Resolve tenant from REQUEST (auth required)
    // ------------------------------------------------------------
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = session.tenant_id;

    if (!tenantId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    // ------------------------------------------------------------
    // Soft delete DB record (DB = source of truth)
    // ------------------------------------------------------------
    const { rowCount } = await query(
      `
      update clips
      set deleted_at = now()
      where tenant_id = $1
        and object_key = $2
        and deleted_at is null
      `,
      [tenantId, key]
    );

    // Idempotent success (already deleted or never existed)
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
    console.error("[r2 delete] real error", err);
    return NextResponse.json(
      { ok: false, error: "delete failed" },
      { status: 500 }
    );
  }
}
