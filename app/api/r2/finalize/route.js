import { NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { guessContentType } from "@/lib/r2/contentType";
import { query } from "@/lib/db";

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
      return NextResponse.json({ ok: false, error: "missing key" }, { status: 400 });
    }

    const { tenantId, user } = await getTenantContext(req);
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const client = getR2Client();
    const head = await client.send(
      new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key })
    );

    const byteSize = head.ContentLength || null;
    const filename = key.split("/").pop();
    const mimeType = guessContentType(filename);

    await query(
      `
      insert into clips (
        tenant_id,
        user_id,
        object_key,
        title,
        mime_type,
        byte_size
      )
      values ($1, $2, $3, $4, $5, $6)
      on conflict (object_key) do nothing
      `,
      [tenantId, user?.id || null, key, filename, mimeType, byteSize]
    );

    return NextResponse.json({ ok: true, key, mimeType, byteSize });
  } catch (err) {
    console.error("[r2 finalize] real error", err);
    return NextResponse.json({ ok: false, error: "finalize failed" }, { status: 500 });
  }
}
