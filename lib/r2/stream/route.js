// app/api/r2/stream/route.js
import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { guessContentType } from "@/lib/r2/contentType";

function nodeStreamToWeb(stream) {
  return new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });
}

export const runtime = "nodejs";

export async function GET(req) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "Missing key" },
      { status: 400 }
    );
  }

  try {
    const client = getR2Client();
    const res = await client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );

    const bodyStream = res.Body;
    const webStream = nodeStreamToWeb(bodyStream);
    const contentType = guessContentType(key);

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch (err) {
    console.error("stream error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to stream clip" },
      { status: 500 }
    );
  }
}
