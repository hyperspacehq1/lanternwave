// netlify/functions/sms.ts
import { Handler } from '@netlify/functions';
import { Client } from '@neondatabase/serverless';
import fetch from 'node-fetch';

const SECURITY_QUESTION = "What do you wear when it's raining?";
const SECURITY_KEYWORDS = ['green', 'umbrella']; // match any variation

// ----- UTILS -----
const twiml = (msg: string) => `
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${msg}</Message>
</Response>`;

const normalize = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, ' ');

const matchesSecurityAnswer = (text: string): boolean => {
  const n = normalize(text);
  return SECURITY_KEYWORDS.every(kw => n.includes(kw));
};

// Neon DB Helper
const query = async (sql: string, params: any[] = []) => {
  const client = new Client(process.env.NETLIFY_DATABASE_URL);
  await client.connect();
  const result = await client.query(sql, params);
  await client.end();
  return result;
};

// ----- SYSTEM PROMPT BUILDER (HOLLOWAY) -----
const buildHollowayPrompt = async (missionId: number, phoneNumber: string) => {
  // Fetch Mission
  const missionRes = await query(
    `SELECT * FROM missions WHERE id = $1`,
    [missionId]
  );
  const mission = missionRes.rows[0];

  // Fetch related mission data
  const [goalsRes, locationsRes, itemsRes, npcsRes, agentStateRes] =
    await Promise.all([
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
        SELECT * FROM agent_state
        WHERE mission_id = $1 AND phone_number = $2
      `, [missionId, phoneNumber])
    ]);

  const agentState = agentStateRes.rows[0];

  // Known vs Unknown
  const knownGoals = goalsRes.rows.filter((g: any) => g.is_known);
  const knownLocations = locationsRes.rows.filter((l: any) => l.is_known);
  const knownItems = itemsRes.rows.filter((i: any) => i.is_known);
  const knownNpcs = npcsRes.rows.filter((n: any) => n.is_known);

  const unknownSummary = mission.summary_unknown || '';
  const unknownNpcs = npcsRes.rows.filt
