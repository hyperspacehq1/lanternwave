import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getR2Client, BUCKET } from "./r2-client.js";
import { corsResponse, handleOptions } from "./cors.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return handleOptions();

  try {
    const r2 = getR2Client();
    const res = await r2.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: "clips/" })
    );

    const items =
      (res.Contents || []).map((o) => ({
        key: o.Key,
        size: o.Size,
        lastModified: o.LastModified,
      })) || [];

    return corsResponse({ ok: true, items });
  } catch (err) {
    console.error(err);
    return corsResponse({ ok: false, error: err.message }, 500);
  }
};
