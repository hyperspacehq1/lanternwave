import { query } from "../util/db.js";

export const handler = async (event) => {
  const params = new URLSearchParams(event.body || "");
  const from = params.get("From");
  const body = params.get("Body");

  try {
    await query(
      `INSERT INTO sms_failover_log (from_number, body, received_at, processed)
       VALUES ($1,$2,NOW(),false)`,
      [from, body]
    );
  } catch (err) {
    console.error("FAILOVER LOG ERROR:", err);
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/xml" },
    body:
      "<Response><Message>Temporary system outage. Your message was saved.</Message></Response>",
  };
};
