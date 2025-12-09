// lib/r2/server.js
import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ACCOUNT_ID,
  R2_S3_ENDPOINT,
  R2_BUCKET,
} = process.env;

if (!R2_BUCKET) {
  console.warn("R2_BUCKET is not set – R2 client will not work correctly.");
}

const endpoint =
  R2_S3_ENDPOINT ||
  (R2_ACCOUNT_ID
    ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined);

export const R2_BUCKET_NAME = R2_BUCKET;

export function getR2Client() {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 credentials are not set in environment variables.");
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}
