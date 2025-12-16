import { NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { getTenantContext } from "@/lib/tenant/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    // ------------------------------------------------------------
    // Resolve tenant from cookies (Option A)
    // ------------------------------------------------------------
    const { prefix, tenantId } = getTenantContext();

    // ------------------------------------------------------------
    // List clips from R2 under tenant namespace
    // ------------------------------------------------------------
    const client = getR2Client();

    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: `${prefix}/clips/`,
      })
    );

    const items =
      res.Contents?.map((obj) => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
      })) || [];

    return NextResponse.json({
      ok: true,
      tenant: tenantId,
      items,
    });
  } catch (err) {
    console.error("r2 list error:", err);
    return NextResponse.json(
      { ok: false, error: "list failed" },
      { status: 500 }
    );
  }
}
