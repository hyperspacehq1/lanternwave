import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { getTenantContext } from "@/lib/tenant/server";
import { guessContentType } from "@/lib/r2/contentType";

export const runtime = "nodejs";

/**
 * Convert Node.js stream to Web ReadableStream
 * (required for Next.js Response streaming)
 */
function nodeStreamToWeb(stream) {
  return new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json(
      { ok: false, error: "missing key" },
      { status: 400 }
    );
  }

  try {
    // ------------------------------------------------------------
    // Resolve tenant from cookies (Option A)
    // ------------------------------------------------------------
    const { prefix } = getTenantContext();

    // ------------------------------------------------------------
    // Enforce tenant isolation
    // ------------------------------------------------------------
    if (!key.startsWith(prefix + "/")) {
      return NextResponse.json(
        { ok: false, error: "invalid tenant key" },
        { status: 403 }
      );
    }

    // ------------------------------------------------------------
    // Stream object from R2
    // ------------------------------------------------------------
    const client = getR2Client();
    const result = await client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );

    return new Response(nodeStreamToWeb(result.Body), {
      headers: {
        "Content-Type": guessContentType(key),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("r2 stream error:", err);
    return NextResponse.json(
      { ok: false, error: "stream failed" },
      { status: 500 }
    );
  }
}
