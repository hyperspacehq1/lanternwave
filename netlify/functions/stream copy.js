import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, BUCKET, guessContentType } from "./r2-client.js";
import { handleOptions, corsHeaders } from "./cors.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return handleOptions();

  const key = event.queryStringParameters?.key;
  if (!key)
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, error: "missing key" }),
    };

  try {
    const r2 = getR2Client();
    const cmd = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentType: guessContentType(key),
    });

    const url = await getSignedUrl(r2, cmd, { expiresIn: 300 });

    return {
      statusCode: 302,
      headers: {
        ...corsHeaders(),
        Location: url,
      },
      body: "",
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
