// netlify/functions/sms-health-check.js
import { query } from "../util/db.js";

function json(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

export const handler = async () => {
  const result = {
    neon: { ok: false, error: null },
    openai: { ok: false, error: null },
  };

  /* ---------------------- Check Neon / Postgres ---------------------- */
  try {
    const res = await query("SELECT NOW() AS now");
    result.neon.ok = true;
    result.neon.now = res.rows[0].now;
  } catch (err) {
    console.error("Health check Neon error:", err);
    result.neon.error = err.message || String(err);
  }

  /* ---------------------- Check OpenAI ---------------------- */
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);

    const data = await res.json();
    result.openai.ok = true;
    result.openai.model_count = Array.isArray(data.data)
      ? data.data.length
      : null;
  } catch (err) {
    console.error("Health check OpenAI error:", err);
    result.openai.error = err.message || String(err);
  }

  return json(200, result);
};
