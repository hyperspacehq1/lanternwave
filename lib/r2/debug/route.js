// app/api/r2/debug/route.js
import { NextResponse } from "next/server";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { ListBucketsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

export async function GET() {
  const report = {};

  try {
    // 1. Check environment variables
    report.env = {
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? "SET" : "MISSING",
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? "SET" : "MISSING",
      R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || "(undefined)",
      R2_S3_ENDPOINT: process.env.R2_S3_ENDPOINT || "(undefined)",
      R2_BUCKET_NAME: R2_BUCKET_NAME || "(undefined)",
    };

    // 2. Try to init R2 client
    let client;
    try {
      client = getR2Client();
      report.clientInit = "SUCCESS";
    } catch (err) {
      report.clientInit = "FAILED";
      report.clientInitError = err.message;
      return NextResponse.json(report, { status: 500 });
    }

    // 3. Check bucket listing permissions
    try {
      const buckets = await client.send(new ListBucketsCommand({}));
      report.listBuckets = buckets;
    } catch (err) {
      report.listBucketsError = err.message;
    }

    // 4. Try listing objects inside the bucket
    try {
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket: R2_BUCKET_NAME,
          Prefix: "clips/",
        })
      );
      report.listObjects = res.Contents || [];
    } catch (err) {
      report.listObjectsError = err.message;
    }

    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { fatalError: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}
