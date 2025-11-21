import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, BUCKET } from "./r2-client.js";
import { corsResponse, handleOptions } from "./cors.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return handleOptions();

  const key = event.queryStringParameters?.key;
  if (!key) return corsResponse({ ok: false, error: "missing key" }, 400);

  try {
    const r2 = getR2Client();
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    return corsResponse({ ok: true, deleted: key });
  } catch (err) {
    console.error(err);
    return corsResponse({ ok: false, error: err.message }, 500);
  }
};
