// /lib/r2/client.js
import { S3Client } from "@aws-sdk/client-s3";

export const BUCKET = process.env.R2_BUCKET;

// ---- DEBUG LOGGING ----
// This will print in Netlify logs at build + runtime.
// It proves which environment variables and file version are being used.
console.log("🔥 R2 CLIENT LOADING");
console.log("  R2_S3_ENDPOINT:", process.env.R2_S3_ENDPOINT);
console.log("  R2_BUCKET:", process.env.R2_BUCKET);
console.log("  Access Key Present:", !!process.env.R2_ACCESS_KEY_ID);
console.log("  Secret Key Present:", !!process.env.R2_SECRET_ACCESS_KEY);

let _client = null;

export function getR2() {
  if (_client) return _client;

  const endpoint = process.env.R2_S3_ENDPOINT;

  console.log("🔥 Creating S3Client with:");
  console.log("  endpoint:", endpoint);
  console.log("  region: auto");
  console.log("  forcePathStyle: true");

  _client = new S3Client({
    region: "auto",
    endpoint,                     // MUST use R2_S3_ENDPOINT, not R2_ENDPOINT
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,         // Required for Cloudflare R2
  });

  return _client;
}
