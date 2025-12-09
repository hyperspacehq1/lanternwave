import { NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getR2, BUCKET } from "@/lib/r2/client";

export async function GET() {
  try {
    const r2 = getR2();
    const res = await r2.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: "clips/"
      })
    );

    const items =
      (res.Contents || []).map((o) => ({
        key: o.Key,
        size: o.Size,
        lastModified: o.LastModified
      })) || [];

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("list error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
