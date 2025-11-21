import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, BUCKET, guessContentType } from "./r2-client.js";
import { corsResponse, handleOptions } from "./cors.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return handleOptions();
  if (event.httpMethod !== "POST")
    return corsResponse({ error: "Method Not Allowed" }, 405);

  try {
    const body = JSON.parse(event.body || "{}");
    const filename = body.filename || "clip";
    const contentType = body.contentType || guessContentType(filename);
    const safeName = filename.replace(/[^\w.\-]+/g, "_");
    const key = `clips/${Date.now()}-${safeName}`;

    const r2 = getR2Client();
    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2, cmd, { expiresIn: 600 });

    return corsResponse({ ok: true, key, uploadUrl, contentType });
  } catch (err) {
    console.error(err);
    return corsResponse({ ok: false, error: err.message }, 500);
  }
};
