import { NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getR2, BUCKET } from "@/lib/r2/client";

export async function POST(req) {
  try {
    const { key } = await req.json();
    if (!key) return NextResponse.json({ ok: false, error: "missing key" }, { status: 400 });

    const r2 = getR2();
    await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));

    return NextResponse.json({ ok: true, key });
  } catch (err) {
    console.error("finalize error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
