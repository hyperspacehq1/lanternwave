import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { getTenantContext } from "@/lib/tenant/server";

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
    // Resolve tenant from cookies (Option A)
    // ------------------------------------------------------------
    const { prefix, tenantId } = getTenantContext();

    // Enforce tenant isolation
    if (!key.startsWith(prefix + "/")) {
      return NextResponse.json(
        { ok: false, error: "invalid tenant key" },
        { status: 403 }
      );
    }

    // ------------------------------------------------------------
    // Delete from R2
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
      tenant: tenantId,
    });
  } catch (err) {
    console.error("r2 delete error:", err);
    return NextResponse.json(
      { ok: false, error: "delete failed" },
      { status: 500 }
    );
  }
}
