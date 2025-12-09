import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2, BUCKET } from "@/lib/r2/client";
import { guessContentType } from "@/lib/r2/contentType";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) return NextResponse.json({ ok: false, error: "missing key" }, { status: 400 });

  try {
    const r2 = getR2();
    const cmd = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentType: guessContentType(key),
    });

    const url = await getSignedUrl(r2, cmd, { expiresIn: 300 });

    return NextResponse.redirect(url, { status: 302 });
  } catch (err) {
    console.error("stream error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
