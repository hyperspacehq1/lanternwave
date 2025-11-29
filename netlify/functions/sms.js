import { query } from "../util/db.js";
import { buildDirectorPrompt } from "../util/director.js";
import { extractMemoryUpdates, mergeMemory } from "../util/memory.js";

function twiml(message) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/xml" },
    body: `<Response><Message>${message}</Message></Response>`,
  };
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const params = new URLSearchParams(event.body);
  const from = params.get("From");
  const body = (params.get("Body") || "").trim();

  try {
    await query(
      `INSERT INTO message_logs
         (session_id, phone_number, direction, body, timestamp)
       VALUES (NULL,$1,'incoming',$2,NOW())`,
      [from, body]
    );

    if (await matchesMissionCode(body)) {
      return await handleMissionCode(body, from);
    }

    const session = await resolvePlayerSession(from);

    if (!session) {
      return twiml(
        "No active operation assigned to this number. " +
          "Send your mission code to begin."
      );
    }

    const missionRow = await query(
      "SELECT * FROM missions WHERE id=$1",
      [session.mission_id]
    );
    const mission = missionRow.rows[0];

    const npcRow = await query(
      "SELECT * FROM npcs WHERE primary_category='director' LIMIT 1"
    );
    const directorNpc = npcRow.rows[0];

    if (!directorNpc) {
      return twiml("System error: Director not configured.");
    }

    const [npcState, playerState, logs] = await Promise.all([
      getNpcState(session.id, directorNpc.id, from),
      getPlayerState(session.id, from),
      getLogs(session.id, from),
    ]);

    const systemPrompt = buildDirectorPrompt({
      mission,
      npc: directorNpc,
      npcState,
      playerState,
      logs,
    });

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body },
        ],
      }),
    });

    if (!openaiRes.ok) {
      console.error("OpenAI error:", await openaiRes.text());
      return twiml("System error. Please stand by.");
    }

    const openaiJson = await openaiRes.json();
    const reply =
      openaiJson.choices?.[0]?.message?.content?.trim() ||
      "The Director is unavailable.";

    await query(
      `INSERT INTO message_logs
         (session_id, phone_number, direction, body, timestamp)
       VALUES ($1,$2,'outgoing',$3,NOW())`,
      [session.id, from, reply]
    );

    const memoryUpdates = extractMemoryUpdates({
      mission,
      npc: directorNpc,
      npcState,
      playerState,
      playerMessage: body,
      npcReply: reply,
    });

    const mergedState = mergeMemory(npcState, memoryUpdates);

    await query(
      `INSERT INTO mission_npc_state
         (session_id, npc_id, phone_number, knowledge_json, flags_json, trust_level, last_interaction)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (session_id, npc_id, phone_number)
       DO UPDATE SET
         knowledge_json = EXCLUDED.knowledge_json,
         flags_json = EXCLUDED.flags_json,
         trust_level = EXCLUDED.trust_level,
         last_interaction = NOW()`,
      [
        session.id,
        directorNpc.id,
        from,
        mergedState.knowledge_json,
        mergedState.flags_json,
        mergedState.trust_level,
      ]
    );

    return twiml(reply);
  } catch (err) {
    console.error("SMS ERROR:", err);
    return twiml("System error.");
  }
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

async function handleMissionCode(code, from) {
  const missionRes = await query(
    "SELECT * FROM missions WHERE mission_id_code=$1",
    [code.trim()]
  );
  if (missionRes.rows.length === 0) {
    return twiml("Invalid mission code.");
  }
  const mission = missionRes.rows[0];

  const sessionsRes = await query(
    `SELECT *
     FROM mission_sessions
     WHERE mission_id=$1
       AND status='active'
     ORDER BY id ASC`,
    [mission.id]
  );
  const sessions = sessionsRes.rows;

  let sessionToJoin;

  if (sessions.length === 0) {
    const newSessionRes = await query(
      `INSERT INTO mission_sessions (mission_id, session_name, status, started_at, created_at)
       VALUES ($1,$2,'active',NOW(),NOW())
       RETURNING *`,
      [mission.id, mission.name || `Mission ${mission.id}`]
    );
    sessionToJoin = newSessionRes.rows[0];
  } else {
    sessionToJoin = sessions[sessions.length - 1];
  }

  await query(
    `INSERT INTO session_players (session_id, phone_number)
     VALUES ($1,$2)
     ON CONFLICT (session_id, phone_number) DO NOTHING`,
    [sessionToJoin.id, from]
  );

  await query(
    `INSERT INTO mission_player_state
       (session_id, phone_number, progress_flags, discovered_clues, last_update)
     VALUES ($1,$2,'{}','[]',NOW())
     ON CONFLICT (session_id, phone_number)
     DO NOTHING`,
    [sessionToJoin.id, from]
  );

  return twiml(
    "Mission code verified. " +
      "You have been added to an active operation. " +
      "Stand by for instructions from your Director."
  );
}

async function matchesMissionCode(code) {
  const r = await query(
    "SELECT 1 FROM missions WHERE mission_id_code=$1",
    [code.trim()]
  );
  return r.rows.length > 0;
}

async function resolvePlayerSession(phone) {
  const r = await query(
    `SELECT ms.*
     FROM session_players sp
     JOIN mission_sessions ms ON ms.id = sp.session_id
     WHERE sp.phone_number=$1
       AND ms.status='active'
     ORDER BY ms.id DESC
     LIMIT 1`,
    [phone]
  );
  return r.rows[0] || null;
}

async function getNpcState(sessionId, npcId, phone) {
  const r = await query(
    `SELECT *
     FROM mission_npc_state
     WHERE session_id=$1 AND npc_id=$2 AND phone_number=$3`,
    [sessionId, npcId, phone]
  );
  return r.rows[0] || {};
}

async function getPlayerState(sessionId, phone) {
  const r = await query(
    `SELECT *
     FROM mission_player_state
     WHERE session_id=$1 AND phone_number=$2`,
    [sessionId, phone]
  );
  return r.rows[0] || {};
}

async function getLogs(sessionId, phone) {
  const r = await query(
    `SELECT *
     FROM message_logs
     WHERE session_id=$1 AND phone_number=$2
     ORDER BY timestamp ASC`,
    [sessionId, phone]
  );
  return r.rows;
}
