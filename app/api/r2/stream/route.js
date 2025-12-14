import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getR2, BUCKET } from "@/lib/r2/client";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "missing tenant context" },
      { status: 401 }
    );
  }

  // Enforce RLS
  await query(
    `SET LOCAL app.tenant_id = $1`,
    [tenantId]
  );

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json(
      { ok: false, error: "missing key" },
      { status: 400 }
    );
  }

  try {
    const r2 = getR2();
    const result = await r2.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );

    return new Response(result.Body, {
      headers: {
        "Content-Type": result.ContentType || "application/octet-stream",
      },
    });
  } catch (err) {
    console.error("r2 stream error:", err);
    return NextResponse.json(
      { ok: false, error: "stream failed" },
      { status: 500 }
    );
  }
}
