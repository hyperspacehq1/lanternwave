import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2, BUCKET } from "@/lib/r2/client";
import { guessContentType } from "@/lib/r2/contentType";

export async function POST(req) {
  try {
    const { filename } = await req.json();
    const safe = filename.replace(/[^\w.\-]+/g, "_");
    const key = `clips/${Date.now()}-${safe}`;

    const r2 = getR2();
    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: guessContentType(filename)
    });

    const uploadUrl = await getSignedUrl(r2, cmd, { expiresIn: 600 });

    return NextResponse.json({ ok: true, key, uploadUrl });
  } catch (err) {
    console.error("upload-url error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
