// lib/r2/client.js
import { S3Client } from "@aws-sdk/client-s3";

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ACCOUNT_ID,
  R2_S3_ENDPOINT,
  R2_BUCKET
} = process.env;

export const BUCKET = R2_BUCKET;

export function getR2() {
  const endpoint =
    R2_S3_ENDPOINT ||
    (R2_ACCOUNT_ID
      ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : undefined);

  if (!endpoint) throw new Error("R2 endpoint not configured.");

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY
    }
  });
}
