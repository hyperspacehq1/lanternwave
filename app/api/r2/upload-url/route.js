import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { guessContentType } from "@/lib/r2/contentType";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const DEFAULT_STORAGE_LIMIT = 6 * 1024 * 1024 * 1024; // 6GB

const ALLOWED_MIME = new Set([
  "audio/mpeg", // .mp3
  "video/mp4",  // .mp4
  "image/jpeg", // .jpg
  "image/png",  // .png
]);

export async function POST(req) {
  try {
    // ✅ Enforce JSON contract (matches your old working routes)
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return NextResponse.json(
        { ok: false, error: "Expected application/json" },
        { status: 415 }
      );
    }

    const body = await req.json();
    const filename = body?.filename;
    const size = Number(body?.size);

    if (!filename || !Number.isFinite(size)) {
      return NextResponse.json(
        { ok: false, error: "missing filename or size" },
        { status: 400 }
      );
    }

    if (size <= 0) {
      return NextResponse.json(
        { ok: false, error: "invalid size" },
        { status: 400 }
      );
    }

    if (size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "file too large", maxSize: MAX_FILE_SIZE },
        { status: 413 }
      );
    }

    // 🔐 Resolve tenant from REQUEST (auth required)
    const { tenant } = await getTenantContext(req);
    if (!tenant?.id) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    // Sanitize filename (same spirit as old route)
    const safe = String(filename).replace(/[^\w.\-]+/g, "_");
    if (!safe || safe === "." || safe === "_") {
      return NextResponse.json(
        { ok: false, error: "invalid filename" },
        { status: 400 }
      );
    }

    const mimeType = guessContentType(safe);
    if (!ALLOWED_MIME.has(mimeType)) {
      return NextResponse.json(
        { ok: false, error: "unsupported file type" },
        { status: 415 }
      );
    }

    // -------------------------------
    // Storage quota check (6GB default)
    // -------------------------------
    const { rows } = await tenant.db.query(
      `SELECT COALESCE(SUM(byte_size), 0) AS used FROM clips WHERE tenant_id = $1`,
      [tenant.id]
    );

    const usedBytes = Number(rows?.[0]?.used || 0);
    const limitBytes = Number(tenant.storage_limit_bytes || DEFAULT_STORAGE_LIMIT);

    if (usedBytes + size > limitBytes) {
      return NextResponse.json(
        { ok: false, error: "storage quota exceeded", used: usedBytes, limit: limitBytes },
        { status: 413 }
      );
    }

    // Tenant-scoped object key
    const key = `clips/${tenant.id}/${Date.now()}-${safe}`;

    const client = getR2Client();
    const cmd = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: mimeType,
      // NOTE: do NOT add checksum fields here
      // (see Part 2 below — we want the presign to behave like before)
    });

    const uploadUrl = await getSignedUrl(client, cmd, { expiresIn: 600 });

    return NextResponse.json({
      ok: true,
      key,
      uploadUrl,
      filename: safe,
      contentType: mimeType,
      maxSize: MAX_FILE_SIZE,
      usedBytes,
      remainingBytes: limitBytes - usedBytes,
    });
  } catch (err) {
    console.error("[r2 upload-url] real error", err);
    return NextResponse.json(
      { ok: false, error: "upload-url failed" },
      { status: 500 }
    );
  }
}
