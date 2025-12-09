import { NextResponse } from "next/server";
import { getR2, R2_BUCKET } from "@/lib/r2/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

export async function GET() {
  try {
    const r2 = getR2();
    const res = await r2.send(new ListObjectsV2Command({ Bucket: R2_BUCKET }));

    return NextResponse.json({
      ok: true,
      items: (res.Contents || []).map((obj) => ({
        key: obj.Key,
        lastModified: obj.LastModified,
        size: obj.Size,
      })),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message });
  }
}
