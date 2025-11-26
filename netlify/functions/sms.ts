// netlify/functions/sms.ts
import { Handler } from "@netlify/functions";
import { Client } from "@neondatabase/serverless";

// -------- UTILITIES --------
const twiml = (msg) => `
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${msg}</Message>
</Response>`;

const normalize = (s) =>
  s.trim().toLowerCase().replace(/\s+/g, " ");

const SECURITY_QUESTION = "What do you wear when it's raining?";
const SECURITY_KEYWORDS = ["green", "umbrella"];

const matchesSecurityAnswer = (text) => {
  const n = normalize(text);
  return SECURITY_KEYWORDS.every((kw) => n.includes(kw));
};

const query = async (sql, params = []) => {
  const client = new Client(process.env.NETLIFY_DATABASE_URL);
  await client.connect();
  const result = await client.query(sql, params);
  await client.end();
  return result;
};

// -------- PROMPT BUILDER --------
const buildHollowayPrompt = async (missionId, phoneNumber) => {
  const missionRes = await query(
    `SELECT * FROM missions WHERE id = $1`,
    [missionId]
  );
  const mission = missionRes.rows[0];

  const [goalsRes, locRes, itemsRes, npcsRes, agentStateRes] = await Promise.all([
    query(`SELECT * FROM mission_goals WHERE mission_id = $1 ORDER BY priority ASC`, [missionId]),
    query(`SELECT * FROM mission_locations WHERE mission_id = $1`, [missionId]),
    query(`SELECT * FROM mission_items WHERE mission_id = $1`, [missionId]),
    query(`
      SELECT n.display_name, n.primary_category, n.secondary_subtype, n.intent,
             n.description_public, n.description_secret, mn.is_known
      FROM mission_npcs mn
      JOIN npcs n ON mn.npc_id = n.id
      WHERE mn.mission_id = $1
    `, [missionId]),
    query(`
      SELECT * FROM agent_state WHERE mission_id = $1 AND phone_number = $2
    `, [missionId, phoneNumber])
  ]);

  const agent = agentStateRes.rows[0] || {};

  const knownGoals = goalsRes.rows.filter((g) => g.is_known);
  const knownLocs = locRes.rows.filter((l) => l.is_known);
  const knownItems = itemsRes.rows.filter((i) => i.is_known);
  const knownNpcs = npcsRes.rows.filter((n) => n.is_known);

  const unknownSummary = mission.summary_unknown || "";
  const unknownNpcs = npcsRes.rows.filter((n) => !n.is_known);
  const unknownLocs = locRes.rows.filter((l) => !l.is_known);
  const unknownItems = itemsRes.rows.filter((i) => !i.is_known);

  return `
You are Director Holloway (DIR-4), senior command of Delta Green’s Special Activities Wing.
Communicate tersely, clinically, without emotion. Never break character.

KNOWN MISSION DATA:
Mission ID: ${mission.mission_id_code}
Name: ${mission.name}
Region: ${mission.region}
Weather: ${mission.weather}
Date: ${mission.mission_date}
Summary: ${mission.summary_known || "None"}

Goals:
${knownGoals.map((g) => `- [P${g.priority}] ${g.description}`).join("\n")}

Locations:
${knownLocs.map((l) => `- ${l.name} (${l.address || ""})`).join("\n")}

Items:
${knownItems.map((i) => `- ${i.name}: ${i.description || ""}`).join("\n")}

Known NPCs:
${knownNpcs
    .map(
      (n) =>
        `- ${n.display_name} [${n.primary_category}/${n.secondary_subtype}/${n.intent}] - ${n.description_public}`
    )
    .join("\n")}

AGENT STATE:
trust_score: ${agent.trust_score ?? 0}
is_compromised: ${agent.is_compromised ?? false}
exposure: ${agent.anomaly_exposure_lvl ?? 0}
mission_stage: ${agent.mission_stage ?? 0}
needs_psych_eval: ${agent.needs_psych_eval ?? false}

UNKNOWN (GM ONLY — NEVER REVEAL):
Hidden Summary: ${unknownSummary}
Unknown NPCs: ${unknownNpcs.map((n) => n.display_name).join(", ")}
Unknown Locations: ${unknownLocs.map((l) => l.name).join(", ")}
Unknown Items: ${unknownItems.map((i) => i.name).join(", ")}

RULES:
- Speak as Holloway only.
- Never reveal unknown data.
- Probing is allowed; disclosure is not.
- Use operational security tone.
- Reprimand oversharing.
`;
};

// -------- MAIN HANDLER --------
export const handler: Handler = async (event) => {
  const params = new URLSearchParams(event.body || "");
  const from = params.get("From") || "";
  const body = (params.get("Body") || "").trim();

  try {
    // Retrieve or create session
    const sessionRes = await query(
      `SELECT * FROM phone_sessions WHERE phone_number = $1
       ORDER BY last_active_at DESC LIMIT 1`,
      [from]
    );
    let session = sessionRes.rows[0];

    // -----------------------------------------
    // 1) Awaiting Mission Code
    // -----------------------------------------
    if (!session || session.stage === "AWAITING_MISSION_CODE") {
      const isCode = /^\d{5}$/.test(body);

      if (!isCode) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/xml" },
          body: twiml("You have reached the wrong number."),
        };
      }

      const missionRes = await query(
        `SELECT id FROM missions WHERE mission_id_code = $1`,
        [body]
      );
      const mission = missionRes.rows[0];

      if (!mission) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/xml" },
          body: twiml("You have reached the wrong number."),
        };
      }

      // Create or update session
      if (!session) {
        const res = await query(
          `INSERT INTO phone_sessions (phone_number, mission_id, stage)
           VALUES ($1, $2, 'AWAITING_SECURITY_ANSWER')
           RETURNING *`,
          [from, mission.id]
        );
        session = res.rows[0];
      } else {
        const res = await query(
          `UPDATE phone_sessions
           SET mission_id = $1,
               stage = 'AWAITING_SECURITY_ANSWER',
               security_attempts = 0,
               is_verified = FALSE,
               last_active_at = NOW()
           WHERE id = $2
           RETURNING *`,
          [mission.id, session.id]
        );
        session = res.rows[0];
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/xml" },
        body: twiml(SECURITY_QUESTION),
      };
    }

    // -----------------------------------------
    // 2) Security Challenge
    // -----------------------------------------
    if (session.stage === "AWAITING_SECURITY_ANSWER") {
      const attempts = (session.security_attempts || 0) + 1;

      if (!matchesSecurityAnswer(body)) {
        if (attempts >= 3) {
          // Reset session
          await query(
            `UPDATE phone_sessions
             SET stage = 'AWAITING_MISSION_CODE',
                 mission_id = NULL,
                 is_verified = FALSE,
                 security_attempts = $1
             WHERE id = $2`,
            [attempts, session.id]
          );

          return {
            statusCode: 200,
            headers: { "Content-Type": "application/xml" },
            body: twiml("You have reached the wrong number."),
          };
        }

        await query(
          `UPDATE phone_sessions
           SET security_attempts = $1
           WHERE id = $2`,
          [attempts, session.id]
        );

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/xml" },
          body: twiml("Incorrect. Try again. What do you wear when it's raining?"),
        };
      }

      // Correct → Activate
      const res = await query(
        `UPDATE phone_sessions
         SET stage = 'ACTIVE',
             is_verified = TRUE,
             security_attempts = $1
         WHERE id = $2
         RETURNING *`,
        [attempts, session.id]
      );
      session = res.rows[0];

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/xml" },
        body: twiml("Confirmed. Identity accepted. State your situation."),
      };
    }

    // -----------------------------------------
    // 3) ACTIVE SESSION
    // -----------------------------------------
    if (session.stage === "ACTIVE") {
      if (!session.mission_id) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/xml" },
          body: twiml("You have reached the wrong number."),
        };
      }

      // Log player message
      await query(
        `INSERT INTO messages (mission_id, phone_number, is_from_player, body)
         VALUES ($1, $2, TRUE, $3)`,
        [session.mission_id, from, body]
      );

      // Retrieve last conversation messages
      const histRes = await query(
        `SELECT is_from_player, body
         FROM messages
         WHERE mission_id = $1 AND phone_number = $2
         ORDER BY created_at DESC
         LIMIT 15`,
        [session.mission_id, from]
      );

      const history = histRes.rows.reverse();

      // Build system prompt
      const systemPrompt = await buildHollowayPrompt(
        session.mission_id,
        from
      );

      const messagesForOpenAI = [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({
          role: m.is_from_player ? "user" : "assistant",
          content: m.body,
        })),
      ];

      // OpenAI call
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: messagesForOpenAI,
          temperature: 0.7,
        }),
      });

      const aiJson = await aiRes.json();

      const replyText =
        aiJson?.choices?.[0]?.message?.content ||
        "Signal degraded. Repeat your last transmission.";

      // Log NPC reply
      await query(
        `INSERT INTO messages (mission_id, phone_number, is_from_player, body)
         VALUES ($1, $2, FALSE, $3)`,
        [session.mission_id, from, replyText]
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/xml" },
        body: twiml(replyText),
      };
    }

    // Fallback
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/xml" },
      body: twiml("You have reached the wrong number."),
    };
  } catch (err) {
    console.error("SMS Handler Error:", err);

    return {
      statusCode: 500,
      body: "Internal Error",
    };
  }
};
