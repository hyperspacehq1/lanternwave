import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2, BUCKET } from "@/lib/r2/client";

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key)
    return NextResponse.json({ ok: false, error: "missing key" }, { status: 400 });

  try {
    const r2 = getR2();
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));

    return NextResponse.json({ ok: true, deleted: key });
  } catch (err) {
    console.error("delete error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
