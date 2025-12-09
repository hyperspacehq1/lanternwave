import { NextResponse } from "next/server";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getR2, BUCKET } from "@/lib/r2/client";

const NOW_KEY = "meta/now-playing.json";

export async function GET() {
  try {
    const r2 = getR2();
    const res = await r2.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: NOW_KEY })
    );

    const text = await res.Body.transformToString();
    return NextResponse.json({ ok: true, nowPlaying: JSON.parse(text || "{}") });
  } catch {
    return NextResponse.json({ ok: true, nowPlaying: null });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const payload = {
      key: body.key || null,
      type: body.type || null,
      updatedAt: new Date().toISOString()
    };

    const r2 = getR2();
    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: NOW_KEY,
        Body: JSON.stringify(payload),
        ContentType: "application/json"
      })
    );

    return NextResponse.json({ ok: true, nowPlaying: payload });
  } catch (err) {
    console.error("now-playing POST error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
