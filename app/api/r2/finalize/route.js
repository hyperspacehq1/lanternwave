import { NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json({ ok: false, error: "missing key" }, { status: 400 });
    }

    const { tenant, user } = await getTenantContext(req);
    if (!tenant?.id) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const client = getR2Client();
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );

    await query(
      `
      INSERT INTO clips (tenant_id, user_id, object_key, mime_type, byte_size)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (object_key) DO NOTHING
      `,
      [
        tenant.id,
        user?.id ?? null,
        key,
        head.ContentType,
        head.ContentLength,
      ]
    );

    return NextResponse.json({
      ok: true,
      key,
      size: head.ContentLength,
      type: head.ContentType,
    });
  } catch (err) {
    console.error("[finalize]", err);
    return NextResponse.json(
      { ok: false, error: "Finalize failed" },
      { status: 500 }
    );
  }
}
