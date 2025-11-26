// netlify/functions/sms-health-check.js
import { query } from "../util/db.js";

export const handler = async () => {
  let neon = "OK";
  let neonError = null;

  let openai = "OK";
  let openaiError = null;

  // ---- NEON / POSTGRES CHECK ----
  try {
    // This will throw if the DB connection fails
    await query("SELECT NOW()");
  } catch (err) {
    neon = "FAIL";
    neonError = err.message || String(err);
  }

  // ---- OPENAI CHECK ----
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY missing");

    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });

    if (!res.ok) {
      openai = "FAIL";
      openaiError = `HTTP ${res.status}`;
    }
  } catch (err) {
    openai = "FAIL";
    openaiError = err.message || String(err);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        neon,
        neonError,
        openai,
        openaiError,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    ),
  };
};
