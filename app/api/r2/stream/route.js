import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { requireAuth } from "@/lib/auth-server";
import { guessContentType } from "@/lib/r2/contentType";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Convert Node.js stream → Web ReadableStream
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
    // Resolve tenant from REQUEST
    // ------------------------------------------------------------
    const session = await requireAuth();
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

const tenantId = session.tenant_id;

    // ------------------------------------------------------------
    // Verify clip exists & belongs to tenant
    // ------------------------------------------------------------
    const { rowCount } = await query(
      `
      select 1
      from clips
      where tenant_id = $1
        and object_key = $2
        and deleted_at is null
      `,
      [tenantId, key]
    );

    if (rowCount === 0) {
      return NextResponse.json(
        { ok: false, error: "clip not found" },
        { status: 404 }
      );
    }

    // ------------------------------------------------------------
    // Handle HTTP Range (REQUIRED for MP4)
    // ------------------------------------------------------------
    const range =
      req.headers.get?.("range") ||
      req.headers?.range ||
      undefined;

    const client = getR2Client();

    const result = await client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Range: range,
      })
    );

    const headers = new Headers();
    headers.set("Content-Type", guessContentType(key));
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "no-store");

    // Partial content (video playback)
    if (range && result.ContentRange) {
      headers.set("Content-Range", result.ContentRange);
      headers.set("Content-Length", String(result.ContentLength));

      return new Response(nodeStreamToWeb(result.Body), {
        status: 206,
        headers,
      });
    }

    // Full content (mp3 / fallback)
    if (result.ContentLength) {
      headers.set("Content-Length", String(result.ContentLength));
    }

    return new Response(nodeStreamToWeb(result.Body), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("[r2 stream] real error", err);
    return NextResponse.json(
      { ok: false, error: "stream failed" },
      { status: 500 }
    );
  }
}
