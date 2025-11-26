// netlify/functions/sms.js
import { query } from "../util/db.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const params = new URLSearchParams(event.body);
  const from = params.get("From");
  const body = (params.get("Body") || "").trim().toLowerCase();

  try {
    // SECURITY QUESTION PHASE
    const openCode = process.env.VITE_OPEN_CODE || "umbrella";

    // Check if this is the mission code
    const missionResult = await query(
      "SELECT * FROM missions WHERE mission_id_code=$1",
      [body]
    );

    if (missionResult.rows.length > 0) {
      return twiml(
        "What do you wear when it's raining?"
      );
    }

    // Check if it matches security answer
    if (body.includes(openCode.toLowerCase())) {
      return twiml("Confirmed. Identity accepted. State your situation.");
    }

    // Otherwise, continue to OpenAI chat (example placeholder)
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: body }],
        }),
      }
    );

    const data = await response.json();
    return twiml(data.choices[0].message.content);

  } catch (err) {
    console.error("SMS ERROR:", err);
    return twiml("System error.");
  }
};

function twiml(message) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/xml" },
    body: `<Response><Message>${message}</Message></Response>`,
  };
}
