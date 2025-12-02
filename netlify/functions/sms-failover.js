const db = require("../util/db.js");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = event.body;
    const params = new URLSearchParams(body);

    const from = params.get("From");
    const msgBody = params.get("Body");

    if (!from || !msgBody) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing From or Body" }),
      };
    }

    await db.query(
      `INSERT INTO sms_failover_log (from_number, body, received_at, processed)
       VALUES ($1, $2, NOW(), false)`,
      [from, msgBody]
    );

    return {
      statusCode: 200,
      body: "<Response></Response>",
      headers: { "Content-Type": "text/xml" },
    };

  } catch (err) {
    console.error("sms-failover error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
