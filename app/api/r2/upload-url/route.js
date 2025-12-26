import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "@/lib/r2/server";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { validateUploadRequest } from "@/lib/r2/validateUploadRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  try {
    const validation = await validateUploadRequest(req);
    if (!validation.ok) {
      return NextResponse.json(validation, { status: validation.status });
    }

    const { filename, size, mimeType } = validation;

    const { tenant } = await getTenantContext(req);
    if (!tenant?.id) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const key = `clips/${tenant.id}/${Date.now()}-${filename}`;

    const client = getR2Client();
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: 600,
    });

    return NextResponse.json({
      ok: true,
      key,
      uploadUrl,
      contentType: mimeType,
    });
  } catch (err) {
    console.error("[upload-url]", err);
    return NextResponse.json(
      { ok: false, error: "Upload initialization failed" },
      { status: 500 }
    );
  }
}
