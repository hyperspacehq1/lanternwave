import { NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { getTenantContext } from "@/lib/tenant/server";
import { guessContentType } from "@/lib/r2/contentType";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { key } = await req.json();

    if (!key) {
      return NextResponse.json(
        { ok: false, error: "missing key" },
        { status: 400 }
      );
    }

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
    // Verify object exists in R2
    // ------------------------------------------------------------
    const client = getR2Client();
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );

    const mimeType = guessContentType(key);
    const byteSize = head.ContentLength || null;

    return NextResponse.json({
      ok: true,
      key,
      mimeType,
      byteSize,
      tenant: tenantId,
    });
  } catch (err) {
    console.error("r2 finalize error:", err);
    return NextResponse.json(
      { ok: false, error: "finalize failed" },
      { status: 500 }
    );
  }
}
