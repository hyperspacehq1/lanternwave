// netlify/functions/sms-failover.js
import { query } from "../util/db.js";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const params = new URLSearchParams(event.body || "");

    const from = params.get("From");
    const bodyText = params.get("Body");

    if (!from || !bodyText) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing From or Body" }),
      };
    }

    await query(
      `INSERT INTO sms_failover_log (from_number, body, received_at, processed)
       VALUES ($1, $2, NOW(), false)`,
      [from, bodyText]
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/xml" },
      body: "<Response></Response>",
    };

  } catch (err) {
    console.error("sms-failover error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
