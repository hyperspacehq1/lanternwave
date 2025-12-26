import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "@/lib/r2/server";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { guessContentType } from "@/lib/r2/contentType";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  try {
    // ✅ Enforce JSON only
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { ok: false, error: "Expected application/json" },
        { status: 415 }
      );
    }

    const { filename, size } = await req.json();

    if (!filename || !size) {
      return NextResponse.json(
        { ok: false, error: "missing filename or size" },
        { status: 400 }
      );
    }

    // 🔐 Tenant resolution (required)
    const { tenant } = await getTenantContext(req);
    if (!tenant?.id) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    // 🧠 Sanitize filename
    const safeName = filename.replace(/[^\w.\-]/g, "_");
    const mimeType = guessContentType(safeName);

    // 🔑 Generate signed upload URL
    const key = `clips/${tenant.id}/${Date.now()}-${safeName}`;
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
