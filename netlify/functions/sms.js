// netlify/functions/sms.js
import { query } from "../util/db.js";
import { buildDirectorPrompt } from "../util/director.js";
import { extractMemoryUpdates, mergeMemory } from "../util/memory.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const params = new URLSearchParams(event.body);
  const from = params.get("From");
  const body = (params.get("Body") || "").trim();

  try {
    // 1) Log incoming message
    await query(
      `INSERT INTO message_logs (phone_number, direction, body, timestamp)
       VALUES ($1,'incoming',$2,NOW())`,
      [from, body]
    );

    // 2) SECURITY CHECK — Mission Code Phase 1
    if (await matchesMissionCode(body)) {
      return await handleMissionCode(from, body);
    }

    // 3) SECURITY CHECK — rain/umbrella identity challenge
    if (body.toLowerCase().includes("umbrella")) {
      return twiml("Identity accepted. State your situation.");
    }

    // 4) Find which session this number belongs to
    const session = await resolvePlayerSession(from);

    if (!session) {
      return twiml(
        "No active operation assigned to this number. " +
        "Send your mission code to begin."
      );
    }

    // 5) Load mission
    const missionRow = await query(
      "SELECT * FROM missions WHERE id=$1",
      [session.mission_id]
    );
    const mission = missionRow.rows[0];

    // 6) Load Director NPC
    const npcRow = await query(
      "SELECT * FROM npcs WHERE role='director' LIMIT 1"
    );
    const directorNpc = npcRow.rows[0];

    if (!directorNpc) {
      return twiml("System error: Director not configured.");
    }

    // 7) Load NPC + Player state
    const npcState = await getNpcState(session.id, directorNpc.id, from);
    const playerState = await getPlayerState(session.id, from);
    const recentLogs = await getLogs(session.id, from);

    // 8) Build AI System Prompt
    const { systemPrompt } = buildDirectorPrompt({
      npc: directorNpc,
      mission,
      session,
      npcState,
      playerState,
      recentLogs,
      playerPhone: from,
    });

    // 9) Call OpenAI for Director Reply
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    const aiJson = await aiRes.json();
    const reply =
      aiJson?.choices?.[0]?.message?.content || "…signal noise… retry.";

    // 10) Log outgoing message
    await query(
      `INSERT INTO message_logs (phone_number, direction, body, session_id, timestamp)
       VALUES ($1,'outgoing',$2,$3,NOW())`,
      [from, reply, session.id]
    );

    //
    // 🔥 NMME — NPC Memory Mutation Engine
    //

    // 11) Extract memory mutation from LLM
    const memoryUpdates = await extractMemoryUpdates({
      npc: directorNpc,
      npcState,
      playerMessage: body,
      npcReply: reply,
      openaiKey: process.env.OPENAI_API_KEY
    });

    // 12) Merge updates with old memory
    const mergedState = mergeMemory(npcState, memoryUpdates);

    // 13) Save merged memory to DB
    await query(
      `INSERT INTO mission_npc_state
         (session_id, npc_id, phone_number, knowledge_json, flags_json, trust_level)
       VALUES ($1,$2,$3,$4,$5,$6)
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
        mergedState.trust_level
      ]
    );

    return twiml(reply);

  } catch (err) {
    console.error("SMS ERROR:", err);
    return twiml("System error.");
  }
};

//
// ---------------------------------------------------------------------------
// MISSION CODE HANDLER — also handles multi-player auto join
// ---------------------------------------------------------------------------
//
async function handleMissionCode(from, code) {
  const missionRow = await query(
    "SELECT * FROM missions WHERE mission_id_code=$1",
    [code.trim()]
  );
  const mission = missionRow.rows[0];

  if (!mission) {
    return twiml("Mission code recognized but mission is missing.");
  }

  // Find all active sessions
  const sessionsRes = await query(
    `SELECT * FROM mission_sessions
     WHERE mission_id=$1
       AND status='active'
     ORDER BY id ASC`,
    [mission.id]
  );
  const sessions = sessionsRes.rows;

  // Player already part of one?
  const existing = await resolvePlayerSession(from);
  if (existing) {
    return twiml(
      "Mission code verified. You are already assigned to an active operation."
    );
  }

  // If mission does not allow auto start
  if (!mission.auto_create_sessions) {
    return twiml(
      "Mission code validated. Stand by. A Director will assign you shortly."
    );
  }

  let sessionToJoin = null;

  // 1) No sessions? → create one
  if (sessions.length === 0) {
    const newSessionRes = await query(
      `INSERT INTO mission_sessions (mission_id, session_name, status)
       VALUES ($1,$2,'active') RETURNING *`,
      [mission.id, `AutoRun-${mission.id}-${Date.now()}`]
    );
    sessionToJoin = newSessionRes.rows[0];
  }
  // 2) One or more active → join the most recent
  else {
    sessionToJoin = sessions[sessions.length - 1];
  }

  // Add player to session
  await query(
    `INSERT INTO mission_players (session_id, phone_number)
     VALUES ($1,$2)
     ON CONFLICT DO NOTHING`,
    [sessionToJoin.id, from]
  );

  // Create default player state
  await query(
    `INSERT INTO mission_player_state
     (session_id, phone_number, progress_flags, discovered_clues)
     VALUES ($1,$2,'{}','[]')
     ON CONFLICT DO NOTHING`,
    [sessionToJoin.id, from]
  );

  return twiml(
    "Mission code verified.\n" +
    "You have been added to an active operation.\n" +
    "Stand by for instructions from your Director."
  );
}

//
// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
//
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
     FROM mission_players mp
     JOIN mission_sessions ms ON ms.id = mp.session_id
     WHERE mp.phone_number=$1
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

function twiml(message) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/xml" },
    body: `<Response><Message>${message}</Message></Response>`
  };
}
