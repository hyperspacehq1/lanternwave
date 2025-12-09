// app/api/r2/list-clips/route.js
import { NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";

export async function GET() {
  try {
    const client = getR2Client();

    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: "clips/",
      })
    );

    const items =
      (result.Contents || [])
        .filter((obj) => !!obj.Key && obj.Key !== "clips/")
        .map((obj) => ({
          key: obj.Key,
          lastModified: obj.LastModified,
          size: obj.Size,
        })) || [];

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("list-clips error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to list clips" },
      { status: 500 }
    );
  }
}
