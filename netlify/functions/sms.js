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

    // Insert message into logs
    await db.query(
      `INSERT INTO message_logs (phone_number, body, direction, timestamp)
       VALUES ($1, $2, 'inbound', NOW())`,
      [from, msgBody]
    );

    return {
      statusCode: 200,
      body: "<Response></Response>",
      headers: { "Content-Type": "text/xml" },
    };

  } catch (err) {
    console.error("sms.js error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
