// app/api/r2/delete-clip/route.js
import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";

export async function POST(req) {
  try {
    const url = req.nextUrl;
    let key = url.searchParams.get("key");

    if (!key) {
      const body = await req.json().catch(() => null);
      key = body?.key;
    }

    if (!key) {
      return NextResponse.json(
        { ok: false, error: "Missing key" },
        { status: 400 }
      );
    }

    const client = getR2Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete-clip error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to delete clip" },
      { status: 500 }
    );
  }
}
