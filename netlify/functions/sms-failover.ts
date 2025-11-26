// netlify/functions/sms-failover.ts
import { Handler } from '@netlify/functions';
import { Client } from '@neondatabase/serverless';

const ALERT_WEBHOOK_URL = process.env.FAILOVER_ALERT_WEBHOOK_URL || null;

// Send Slack/Webhook alert (optional)
const sendAlert = async (from: string, body: string) => {
  if (!ALERT_WEBHOOK_URL) return;

  try {
    await fetch(ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🚨 *Twilio FAILOVER Triggered*  
Primary SMS handler failed and fallback endpoint was used.

*From:* ${from}
*Message:* ${body}
*Time:* ${new Date().toISOString()}`
      })
    });
  } catch (err) {
    console.error("Failover alert error:", err);
  }
};

const twiml = (msg: string) => `
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${msg}</Message>
</Response>`;

export const handler: Handler = async (event) => {
  const params = new URLSearchParams(event.body || "");
  const from = params.get("From") || "UNKNOWN";
  const body = params.get("Body") || "";

  try {
    // Log failover event to Neon
    const client = new Client(process.env.NETLIFY_DATABASE_URL);
    await client.connect();

    await client.query(
      `INSERT INTO sms_failover_log (from_number, body, received_at)
       VALUES ($1, $2, NOW())`,
      [from, body]
    );

    await client.end();

    // Notify GM / Admin
    await sendAlert(from, body);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/xml" },
      body: twiml("Signal degraded. Routing through secondary channel.")
    };

  } catch (err) {
    console.error("Failover handler error:", err);

    // MUST still return TwiML to Twilio
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/xml" },
      body: twiml("System integrity uncertain. Hold position.")
    };
  }
};
