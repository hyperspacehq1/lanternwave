import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client } from "@/lib/r2/server";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { guessContentType } from "@/lib/r2/contentType";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const SOFT_QUOTA_RATIO = 0.8;

export async function POST(req) {
  try {
    const body = await req.json();
    const { filename, size } = body;

    if (!filename || !size) {
      return NextResponse.json(
        { ok: false, error: "missing filename or size" },
        { status: 400 }
      );
    }

    // 🔐 Resolve tenant (REQUIRED)
    const { tenant } = await getTenantContext(req);
    if (!tenant?.id) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    // -------------------------------
    // Storage quota check
    // -------------------------------
    const { rows } = await tenant.db.query(
      `
      SELECT COALESCE(SUM(byte_size), 0) AS used
      FROM clips
      WHERE tenant_id = $1
      `,
      [tenant.id]
    );

    const usedBytes = Number(rows[0]?.used || 0);
    const limitBytes = tenant.storage_limit_bytes ?? 10 * 1024 * 1024 * 1024;

    if (usedBytes + size > limitBytes) {
      return NextResponse.json(
        {
          ok: false,
          error: "storage quota exceeded",
          used: usedBytes,
          limit: limitBytes,
        },
        { status: 413 }
      );
    }

    // ----------------------------------
    // Validate + create upload
    // ----------------------------------
    const safeName = filename.replace(/[^\w.\-]/g, "_");
    const contentType = guessContentType(safeName);

    const ALLOWED = [
      "audio/mpeg",
      "audio/wav",
      "video/mp4",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!ALLOWED.includes(contentType)) {
      return NextResponse.json(
        { ok: false, error: "unsupported file type" },
        { status: 415 }
      );
    }

    const key = `clips/${tenant.id}/${Date.now()}-${safeName}`;
    const client = getR2Client();

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: 600,
    });

    return NextResponse.json({
      ok: true,
      key,
      uploadUrl,
      maxSize: MAX_FILE_SIZE,
      usedBytes,
      remainingBytes: limitBytes - usedBytes,
      nearingLimit: usedBytes / limitBytes >= 0.8,
    });
  } catch (err) {
    console.error("upload-url error", err);
    return NextResponse.json(
      { ok: false, error: "Upload initialization failed" },
      { status: 500 }
    );
  }
}
