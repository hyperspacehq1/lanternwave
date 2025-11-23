import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, BUCKET } from "./r2-client.js";
import { corsResponse, handleOptions } from "./cors.js";

const NOW_PLAYING_KEY = "meta/now-playing.json";

function cleanKey(key) {
  // SAFELY normalize keys
  if (typeof key !== "string") return null;
  return key;
}

export const handler = async (event) => {
  const r2 = getR2Client();

  if (event.httpMethod === "OPTIONS") return handleOptions();

  // -----------------------
  // GET NOW-PLAYING
  // -----------------------
  if (event.httpMethod === "GET") {
    try {
      const res = await r2.send(
        new GetObjectCommand({
          Bucket: BUCKET,
          Key: NOW_PLAYING_KEY
        })
      );

      const text = await res.Body.transformToString();
      const data = JSON.parse(text || "{}");

      // Normalize safely
      if (data.key) {
        data.key = cleanKey(data.key);
      }

      return corsResponse({ ok: true, nowPlaying: data });
    } catch {
      // Not set yet
      return corsResponse({ ok: true, nowPlaying: null });
    }
  }

  // -----------------------
  // SET NOW-PLAYING
  // -----------------------
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      let { key, type } = body;

      key = cleanKey(key);

      const payload = {
        key: key || null,
        type: type || null,
        updatedAt: new Date().toISOString()
      };

      await r2.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: NOW_PLAYING_KEY,
          Body: JSON.stringify(payload),
          ContentType: "application/json"
        })
      );

      return corsResponse({ ok: true, nowPlaying: payload });
    } catch (err) {
      console.error("now-playing error:", err);
      return corsResponse({ ok: false, error: err.message }, 500);
    }
  }

  return corsResponse({ error: "Method Not Allowed" }, 405);
};
