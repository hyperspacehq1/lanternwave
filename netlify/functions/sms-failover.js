// netlify/functions/sms-failover.js
import { query } from "../util/db.js";

export const handler = async (event) => {
  const params = new URLSearchParams(event.body);
  const from = params.get("From");
  const body = params.get("Body");

  try {
    await query(
      `INSERT INTO sms_failover_log (phone_number, message_body)
       VALUES ($1,$2)`,
      [from, body]
    );
  } catch (err) {
    console.error("FAILOVER LOG ERROR:", err);
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/xml" },
    body: `<Response><Message>Temporary system outage. Your message was saved.</Message></Response>`
  };
};
