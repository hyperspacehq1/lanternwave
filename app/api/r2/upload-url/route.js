import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { getTenantContext } from "@/lib/tenant/server";
import { guessContentType } from "@/lib/r2/contentType";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { filename } = await req.json();

    if (!filename) {
      return NextResponse.json(
        { ok: false, error: "missing filename" },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // Resolve tenant from cookies (Option A)
    // ------------------------------------------------------------
    const { prefix, tenantId } = getTenantContext();

    // Sanitize filename
    const safe = filename.replace(/[^\w.\-]+/g, "_");

    // ------------------------------------------------------------
    // Tenant-scoped object key
    // ------------------------------------------------------------
    const key = `${prefix}/clips/${Date.now()}-${safe}`;

    const client = getR2Client();

    const cmd = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: guessContentType(filename),
    });

    const uploadUrl = await getSignedUrl(client, cmd, {
      expiresIn: 600,
    });

    return NextResponse.json({
      ok: true,
      tenant: tenantId,
      key,
      uploadUrl,
    });
  } catch (err) {
    console.error("r2 upload-url error:", err);
    return NextResponse.json(
      { ok: false, error: "upload-url failed" },
      { status: 500 }
    );
  }
}
