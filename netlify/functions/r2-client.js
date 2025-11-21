// netlify/functions/r2-client.js
import { S3Client } from "@aws-sdk/client-s3";

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ACCOUNT_ID,
  R2_S3_ENDPOINT,
  R2_BUCKET
} = process.env;

if (!R2_BUCKET) {
  console.warn("R2_BUCKET is not set – R2 client will not work correctly.");
}

export const BUCKET = R2_BUCKET;

export function getR2Client() {
  const endpoint =
    R2_S3_ENDPOINT ||
    (R2_ACCOUNT_ID
      ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : undefined);

  if (!endpoint) {
    throw new Error("R2 endpoint is not configured.");
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY
    }
  });
}

/**
 * Basic content-type helper so we can hint the browser.
 */
export function guessContentType(key = "") {
  const lower = key.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}
