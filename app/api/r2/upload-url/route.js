import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { getTenantContext } from "@/lib/tenant/server";
import { guessContentType } from "@/lib/r2/contentType";

// 🚨 Prevent render-time execution / caching
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();
    const filename = body?.filename;

    if (!filename) {
      return NextResponse.json(
        { ok: false, error: "missing filename" },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // Resolve tenant (AUTH REQUIRED — but NOT exceptional)
    // ------------------------------------------------------------
    const { tenantId, prefix } = getTenantContext({
      allowAnonymous: true,
    });

    if (!tenantId || !prefix) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    // ------------------------------------------------------------
    // Sanitize filename
    // ------------------------------------------------------------
    const safe = filename.replace(/[^\w.\-]+/g, "_");

    if (!safe || safe === "." || safe === "_") {
      return NextResponse.json(
        { ok: false, error: "invalid filename" },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // Tenant-scoped object key (authoritative)
    // ------------------------------------------------------------
    const key = `${prefix}/clips/${Date.now()}-${safe}`;
    const contentType = guessContentType(filename);

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
      filename: safe,
      contentType,
    });
  } catch (err) {
    console.error("[r2 upload-url] real error", err);
    return NextResponse.json(
      { ok: false, error: "upload-url failed" },
      { status: 500 }
    );
  }
}
