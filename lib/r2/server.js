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

// ---------------- DEBUG LOGGING ----------------
console.log("🔥 [R2 SERVER] Loading R2 server-side client");
console.log("  R2_S3_ENDPOINT:", R2_S3_ENDPOINT);
console.log("  R2_ACCOUNT_ID:", R2_ACCOUNT_ID);
console.log("  R2_BUCKET:", R2_BUCKET);
console.log("  Access Key Present:", !!R2_ACCESS_KEY_ID);
console.log("  Secret Key Present:", !!R2_SECRET_ACCESS_KEY);

// Compute endpoint (prefer explicit)
const endpoint =
  R2_S3_ENDPOINT ||
  (R2_ACCOUNT_ID
    ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined);

console.log("🔥 [R2 SERVER] Using endpoint:", endpoint);

export const R2_BUCKET_NAME = R2_BUCKET;

// Single cached client
let _serverClient = null;

export function getR2Client() {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 credentials are not set in environment variables.");
  }

  if (_serverClient) return _serverClient;

  console.log("🔥 [R2 SERVER] Creating S3Client with:");
  console.log("  endpoint:", endpoint);
  console.log("  region: auto");
  console.log("  forcePathStyle: true");

  _serverClient = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,  // REQUIRED for Cloudflare R2
  });

  return _serverClient;
}
