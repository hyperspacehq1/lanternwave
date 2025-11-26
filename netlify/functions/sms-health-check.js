// netlify/functions/sms-health-check.js
import { Client, neonConfig } from "@neondatabase/serverless";

// ------------------------------------------------------
// REQUIRED FOR NETLIFY — disable WebSockets globally
// ------------------------------------------------------
neonConfig.webSocketConstructor = undefined;

// ------------------------------------------------------
// REQUIRED — force Neon to use HTTPS serverless endpoint
// ------------------------------------------------------
neonConfig.fetchEndpoint = (host) => `https://${host}/sql`;

export const handler = async () => {
  let neon = "OK";
  let neonError = null;

  let openai = "OK";
  let openaiError = null;

  // ------------------------------------------------------
  // NEON DATABASE CHECK
  // ------------------------------------------------------
  try {
    const dbURL = process.env.NETLIFY_DATABASE_URL_UNPOOLED;
    if (!dbURL) throw new Error("NETLIFY_DATABASE_URL_UNPOOLED missing");

    const client = new Client(dbURL); // now HTTP-only, no WebSockets
    await client.connect();
    await client.query("SELECT NOW()");
    await client.end();
  } catch (err) {
    neon = "FAIL";
    neonError = err.message || String(err);
  }

  // ------------------------------------------------------
  // OPENAI CHECK
  // ------------------------------------------------------
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

  // ------------------------------------------------------
  // RETURN RESULTS
  // ------------------------------------------------------
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
