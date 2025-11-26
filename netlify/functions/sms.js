// netlify/functions/sms.js
import { query } from "../util/db.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const params = new URLSearchParams(event.body);
  const from = params.get("From");
  const body = (params.get("Body") || "").trim();

  try {
    // Step 1 — Mission code check
    const missionResult = await query(
      "SELECT * FROM missions WHERE mission_id_code=$1",
      [body]
    );

    if (missionResult.rows.length > 0) {
      return twiml("What do you wear when it's raining?");
    }

    // Step 2 — Security Q
    const openCode = "green umbrella";
    if (body.toLowerCase().includes("umbrella")) {
      return twiml("Confirmed. Identity accepted. State your situation.");
    }

    // Step 3 — AI response
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: body }],
      }),
    });

    const aiJson = await aiRes.json();
    const reply = aiJson?.choices?.[0]?.message?.content || "Signal degraded.";

    return twiml(reply);

  } catch (err) {
    console.error("SMS ERROR:", err);
    return twiml("System error.");
  }
};

function twiml(message) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/xml" },
    body: `<Response><Message>${message}</Message></Response>`
  };
}
