import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, BUCKET } from "./r2-client.js";
import { corsResponse, handleOptions } from "./cors.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return handleOptions();
  if (event.httpMethod !== "POST")
    return corsResponse({ error: "Method Not Allowed" }, 405);

  try {
    const body = JSON.parse(event.body || "{}");
    const { key } = body;

    if (!key) return corsResponse({ ok: false, error: "missing key" }, 400);

    const r2 = getR2Client();
    await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));

    return corsResponse({ ok: true, key });
  } catch (err) {
    console.error(err);
    return corsResponse({ ok: false, error: err.message }, 500);
  }
};
