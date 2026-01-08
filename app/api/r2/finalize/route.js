import { NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { guessContentType } from "@/lib/r2/contentType";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return NextResponse.json(
        { ok: false, error: "Expected application/json" },
        { status: 415 }
      );
    }

    const body = await req.json();
    const key = body?.key;

    if (!key) {
      return NextResponse.json(
        { ok: false, error: "missing key" },
        { status: 400 }
      );
    }

   let ctx;
try {
  ctx = await getTenantContext(req);
} catch {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

const tenantId = ctx.tenantId;
const userId = ctx.user?.id ?? null;
    const client = getR2Client();
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );

    const byteSize = head.ContentLength || null;
    const filename = key.split("/").pop();
    const mimeType = guessContentType(filename);

    await query(
      `
      INSERT INTO clips (
        tenant_id,
        user_id,
        object_key,
        title,
        mime_type,
        byte_size
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (object_key) DO NOTHING
      `,
      [tenantId, userId, key, filename, mimeType, byteSize]
    );

    return NextResponse.json({ ok: true, key, mimeType, byteSize });
  } catch (err) {
    console.error("[r2 finalize] real error", err);
    return NextResponse.json(
      { ok: false, error: "finalize failed" },
      { status: 500 }
    );
  }
}
