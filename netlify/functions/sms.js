// netlify/functions/sms.js
import { query } from "../util/db.js";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const params = new URLSearchParams(event.body || "");

    const from = params.get("From");
    const message = params.get("Body");

    if (!from || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing From or Body" }),
      };
    }

    await query(
      `INSERT INTO message_logs (phone_number, body, direction, timestamp)
       VALUES ($1, $2, 'inbound', NOW())`,
      [from, message]
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/xml" },
      body: "<Response></Response>",
    };

  } catch (err) {
    console.error("sms.js error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
