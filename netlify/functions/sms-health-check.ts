// netlify/functions/sms-health-check.ts
import { Handler } from "@netlify/functions";
import { Client } from "@neondatabase/serverless";

export const handler: Handler = async () => {
  let neon = "OK";
  let openai = "OK";

  // Check Neon
  try {
    const client = new Client(process.env.NETLIFY_DATABASE_URL);
    await client.connect();
    await client.query("SELECT NOW()");
    await client.end();
  } catch (err) {
    neon = "FAIL";
    console.error("NEON ERROR:", err);
  }

  // Check OpenAI
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    if (!res.ok) throw new Error("OPENAI non-200");
  } catch (err) {
    openai = "FAIL";
    console.error("OPENAI ERROR:", err);
  }

  const payload = {
    neon,
    openai,
    timestamp: new Date().toISOString(),
  };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload, null, 2),
  };
};
