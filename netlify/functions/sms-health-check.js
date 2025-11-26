// netlify/functions/sms-health-check.js
import { Client } from "@neondatabase/serverless";

export const handler = async () => {
  let neon = "OK";
  let neonError = null;

  let openai = "OK";
  let openaiError = null;

// Neon DB Check
try {
  const dbURL = process.env.NETLIFY_DATABASE_URL;
  if (!dbURL) throw new Error("NETLIFY_DATABASE_URL missing");

  const client = new Client(dbURL, {
    connection: {
      // REQUIRED FIX FOR NETLIFY – same as db.js
      fetchEndpoint: true
    }
  });

  await client.connect();
  await client.query("SELECT NOW()");
  await client.end();
} catch (err) {
  neon = "FAIL";
  neonError = err.message || String(err);
}

  // OpenAI Check
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
