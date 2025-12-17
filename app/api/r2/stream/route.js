import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { getTenantContext } from "@/lib/tenant/server";
import { guessContentType } from "@/lib/r2/contentType";
import { db } from "@/lib/db";

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
    // Resolve tenant
    // ------------------------------------------------------------
    const { tenantId, prefix } = getTenantContext();

    if (!tenantId || !prefix) {
      throw new Error("Tenant context missing");
    }

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
    // Verify clip exists & is not deleted (DB = source of truth)
    // ------------------------------------------------------------
    const { rowCount } = await db.query(
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
    console.error("[r2 stream]", err);
    return NextResponse.json(
      { ok: false, error: "stream failed" },
      { status: 500 }
    );
  }
}
