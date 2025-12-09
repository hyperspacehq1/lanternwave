// app/api/r2/upload/route.js
import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { guessContentType } from "@/lib/r2/contentType";

export const runtime = "nodejs"; // ensure Node, not edge

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const filename = form.get("filename") || (file && file.name) || "upload.bin";

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { ok: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    const key = filename.startsWith("clips/")
      ? filename
      : `clips/${filename}`;

    const arrayBuffer = await file.arrayBuffer();
    const body = Buffer.from(arrayBuffer);

    const client = getR2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: guessContentType(filename),
      })
    );

    return NextResponse.json({ ok: true, key });
  } catch (err) {
    console.error("upload error:", err);
    return NextResponse.json(
      { ok: false, error: "Upload failed" },
      { status: 500 }
    );
  }
}
