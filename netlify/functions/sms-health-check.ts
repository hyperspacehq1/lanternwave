// netlify/functions/sms-health-check.ts
import { Handler } from "@netlify/functions";
import { Client } from "@neondatabase/serverless";

const twiml = (msg: string) => `
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${msg}</Message>
</Response>`;

export const handler: Handler = async () => {
  let neonStatus = "OK";
  let openaiStatus = "OK";

  // 1. Check Neon DB
  try {
    const client = new Client(process.env.NETLIFY_DATABASE_URL);
    await client.connect();
    await client.query("SELECT NOW()");
    await client.end();
  } catch (err) {
    console.error("NEON ERROR:", err);
    neonStatus = "FAIL";
  }

  // 2. Check OpenAI
  try {
    const aiRes = await fetch("https://api.openai.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    if (!aiRes.ok) throw new Error("OpenAI returned non-200");
  } catch (err) {
    console.error("OPENAI ERROR:", err);
    openaiStatus = "FAIL";
  }

  const summary = `Health Check:
Neon: ${neonStatus}
OpenAI: ${openaiStatus}
Time: ${new Date().toISOString()}`;

  // For browser and monitoring tools:
  const jsonResponse = {
    neon: neonStatus,
    openai: openaiStatus,
    timestamp: new Date().toISOString()
  };

  // Return JSON + TwiML
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "X-TwiML": twiml(summary) // optional debug field
    },
    body: JSON.stringify(jsonResponse, null, 2)
  };
};
