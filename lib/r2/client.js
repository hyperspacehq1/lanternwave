import { S3Client } from "@aws-sdk/client-s3";

export const BUCKET = process.env.R2_BUCKET;

export function getR2() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

