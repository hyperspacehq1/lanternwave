// app/api/r2/debug/route.js
import { NextResponse } from "next/server";
import { ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2, BUCKET } from "@/lib/r2/client";

export const runtime = "nodejs";

export async function GET() {
  const report = {};

  try {
    // 1. Env snapshot
    report.env = {
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? "SET" : "MISSING",
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? "SET" : "MISSING",
      R2_S3_ENDPOINT: process.env.R2_S3_ENDPOINT || "(undefined)",
      R2_BUCKET: BUCKET || "(undefined)",
      NODE_ENV: process.env.NODE_ENV || "(undefined)",
    };

    // 2. Init client from the SAME helper used by upload-url
    let client;
    try {
      client = getR2();
      report.clientInit = "SUCCESS";
    } catch (err) {
      report.clientInit = "FAILED";
      report.clientInitError = err.message;
      return NextResponse.json(report, { status: 500 });
    }

    // 3. List objects under clips/
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

    // 4. Generate a test presigned URL exactly like upload-url does
    try {
      const testFilename = "debug-test.txt";
      const testKey = `clips/debug-${Date.now()}-${testFilename}`;

      const cmd = new PutObjectCommand({
        Bucket: BUCKET,
        Key: testKey,
        ContentType: "text/plain",
      });

      const uploadUrl = await getSignedUrl(client, cmd, { expiresIn: 300 });

      let host = null;
      let pathname = null;
      try {
        const u = new URL(uploadUrl);
        host = u.host;
        pathname = u.pathname;
      } catch {
        // ignore URL parse error
      }

      report.presign = {
        ok: true,
        testKey,
        uploadUrl,
        host,
        pathname,
      };
    } catch (err) {
      report.presign = {
        ok: false,
        error: err.message,
      };
    }

    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { fatalError: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}
