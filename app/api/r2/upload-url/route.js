import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { guessContentType } from "@/lib/r2/contentType";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const SOFT_QUOTA_RATIO = 0.8; // 80%

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

    if (size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "file exceeds 500MB limit" },
        { status: 413 }
      );
    }

    // ------------------------------------------------------------
    // Resolve tenant
    // ------------------------------------------------------------
    const { tenantId } = await getTenantContext(req);
    if (!tenantId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    // ------------------------------------------------------------
    // Get tenant storage limits
    // ------------------------------------------------------------
    const [tenant] = await sql`
      SELECT storage_limit_bytes
      FROM tenants
      WHERE id = ${tenantId}
    `;

    const limitBytes = tenant?.storage_limit_bytes ?? 10 * 1024 * 1024 * 1024;

    const [{ used_bytes }] = await sql`
      SELECT COALESCE(SUM(byte_size), 0) AS used_bytes
      FROM clips
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
    `;

    const projectedUsage = used_bytes + size;
    const usageRatio = projectedUsage / limitBytes;
    const nearingLimit = usageRatio >= SOFT_QUOTA_RATIO;

    if (projectedUsage > limitBytes) {
      return NextResponse.json(
        {
          ok: false,
          error: "storage quota exceeded",
          used: used_bytes,
          limit: limitBytes,
        },
        { status: 413 }
      );
    }

    // ------------------------------------------------------------
    // Validate filename + type
    // ------------------------------------------------------------
    const safe = filename.replace(/[^\w.\-]+/g, "_");
    const contentType = guessContentType(safe);

    const ALLOWED_TYPES = [
      "audio/mpeg",
      "audio/wav",
      "video/mp4",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { ok: false, error: "unsupported file type" },
        { status: 415 }
      );
    }

    // ------------------------------------------------------------
    // Create R2 upload URL
    // ------------------------------------------------------------
    const key = `clips/${tenantId}/${Date.now()}-${safe}`;
    const client = getR2Client();

    const cmd = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, cmd, {
      expiresIn: 600,
    });

    return NextResponse.json({
      ok: true,
      key,
      uploadUrl,
      maxSize: MAX_FILE_SIZE,
      usedBytes: used_bytes,
      remainingBytes: limitBytes - used_bytes,
      warning: nearingLimit
        ? "You are approaching your storage limit."
        : null,
    });
  } catch (err) {
    console.error("[upload-url]", err);
    return NextResponse.json(
      { ok: false, error: "upload-url failed" },
      { status: 500 }
    );
  }
}
