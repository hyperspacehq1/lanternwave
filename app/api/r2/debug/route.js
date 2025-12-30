import { NextResponse } from "next/server";
import { ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2, BUCKET } from "@/lib/r2/client";

export const runtime = "nodejs";

export async function GET(req) {
  const tenantId = req.headers.get("x-tenant-id");

  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "missing tenant context" },
      { status: 401 }
    );
  }

  const report = {};

  try {
    // ------------------------------------------------------------
    // 1. Env snapshot (safe, read-only)
    // ------------------------------------------------------------
    report.env = {
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? "SET" : "MISSING",
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? "SET" : "MISSING",
      R2_S3_ENDPOINT: process.env.R2_S3_ENDPOINT || "(undefined)",
      R2_BUCKET: BUCKET || "(undefined)",
      NODE_ENV: process.env.NODE_ENV || "(undefined)",
    };

    // ------------------------------------------------------------
    // 2. Init client (same helper as prod routes)
    // ------------------------------------------------------------
    let client;
    try {
      client = getR2();
      report.clientInit = "SUCCESS";
    } catch (err) {
      report.clientInit = "FAILED";
      report.clientInitError = err.message;
      return NextResponse.json(report, { status: 500 });
    }

    // ------------------------------------------------------------
    // 3. List objects (diagnostic only)
    // ------------------------------------------------------------
    try {
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: "clips/",
          MaxKeys: 20,
        })
      );

      report.listObjects = {
        count: res.Contents?.length || 0,
        objects: (res.Contents || []).map((o) => ({
          key: o.Key,
          size: o.Size,
          lastModified: o.LastModified,
        })),
      };
    } catch (err) {
      report.listObjectsError = err.message;
    }

    // ------------------------------------------------------------
    // 4. Presign test (NO upload performed)
    // ------------------------------------------------------------
    try {
      const testKey = `clips/debug-${Date.now()}-test.txt`;

      const cmd = new PutObjectCommand({
        Bucket: BUCKET,
        Key: testKey,
        ContentType: "text/plain",
      });

      const uploadUrl = await getSignedUrl(client, cmd, { expiresIn: 300 });

      report.presign = {
        ok: true,
        testKey,
        uploadUrl,
      };
    } catch (err) {
      report.presign = { ok: false, error: err.message };
    }

    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { fatalError: err.message },
      { status: 500 }
    );
  }
}
