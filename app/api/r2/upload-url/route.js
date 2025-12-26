import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { guessContentType } from "@/lib/r2/contentType";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const DEFAULT_STORAGE_LIMIT_BYTES = 6 * 1024 * 1024 * 1024; // 6GB

const ALLOWED = new Set([
  "audio/mpeg", // .mp3
  "video/mp4",  // .mp4
  "image/jpeg", // .jpg
  "image/png",  // .png
]);

export async function POST(req) {
  try {
    // ✅ Keep the exact old contract: JSON in, JSON out
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return NextResponse.json(
        { ok: false, error: "Expected application/json" },
        { status: 415 }
      );
    }

    const body = await req.json();
    const filenameRaw = body?.filename;
    const sizeRaw = body?.size;

    const size = Number(sizeRaw);
    if (!filenameRaw || !Number.isFinite(size)) {
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

    // 🔐 Resolve tenant (request-scoped, Netlify-safe) :contentReference[oaicite:3]{index=3}
    const ctx = await getTenantContext(req);

    const tenantId = ctx?.tenantId ?? ctx?.tenant?.id;
    if (!tenantId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    // Sanitize filename similar to old route behavior
    const safeName = String(filenameRaw).replace(/[^\w.\-]+/g, "_");
    if (!safeName || safeName === "." || safeName === "_") {
      return NextResponse.json(
        { ok: false, error: "invalid filename" },
        { status: 400 }
      );
    }

    const mimeType = guessContentType(safeName);
    if (!ALLOWED.has(mimeType)) {
      return NextResponse.json(
        { ok: false, error: "unsupported file type" },
        { status: 415 }
      );
    }

    // -------------------------------
    // Quota check (DB is source of truth)
    // Prefer tenant-scoped db if available, else fallback to shared query.
    // -------------------------------
    const db = ctx?.tenant?.db;
    const usedResult = db
      ? await db.query(
          `SELECT COALESCE(SUM(byte_size), 0) AS used FROM clips WHERE tenant_id = $1`,
          [tenantId]
        )
      : await query(
          `SELECT COALESCE(SUM(byte_size), 0) AS used FROM clips WHERE tenant_id = $1`,
          [tenantId]
        );

    const usedBytes = Number(usedResult?.rows?.[0]?.used || 0);

    const limitBytes = Number(
      ctx?.tenant?.storage_limit_bytes ?? DEFAULT_STORAGE_LIMIT_BYTES
    );

    if (usedBytes + size > limitBytes) {
      return NextResponse.json(
        { ok: false, error: "storage quota exceeded", used: usedBytes, limit: limitBytes },
        { status: 413 }
      );
    }

    // ✅ Key format stays same as old route
    const key = `clips/${tenantId}/${Date.now()}-${safeName}`;

    // ✅ CRITICAL: use the proven bucket constant like the old working route
    const client = getR2Client();
    const cmd = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(client, cmd, { expiresIn: 600 });

    return NextResponse.json({
      ok: true,
      key,
      uploadUrl,
      filename: safeName,
      contentType: mimeType,
      maxSize: MAX_FILE_SIZE,
      usedBytes,
      remainingBytes: limitBytes - usedBytes,
      nearingLimit: usedBytes / limitBytes >= 0.8,
    });
  } catch (err) {
    // Log the real server error so Netlify logs show the true cause.
    console.error("[r2 upload-url] real error", err);
    return NextResponse.json(
      { ok: false, error: "upload-url failed" },
      { status: 500 }
    );
  }
}
