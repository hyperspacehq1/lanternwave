import { query, ident, isSafeIdent } from "@/lib/db/db";
import { v4 as uuidv4 } from "uuid";

/* =========================================================
   PUBLIC ENTRY POINT
========================================================= */
export async function cloneAdventureCodexToTenant({
  templateCampaignId,
  tenantCampaignId,
  tenantId,
  createdBy,
}: {
  templateCampaignId: string;
  tenantCampaignId: string;
  tenantId: string;
  createdBy: string;
}) {
  if (!templateCampaignId || !tenantCampaignId || !tenantId) {
    throw new Error("Missing required clone parameters");
  }

  /* -----------------------------------------------
     STEP 1: CLONE CORE TABLES
  ------------------------------------------------ */
  const idMaps = {
    campaigns: new Map<string, string>(),
    sessions: new Map<string, string>(),
    events: new Map<string, string>(),
    npcs: new Map<string, string>(),
    locations: new Map<string, string>(),
    items: new Map<string, string>(),
    encounters: new Map<string, string>(),
  };

  for (const table of CORE_TABLES) {
    await cloneTable({
      table,
      templateCampaignId,
      tenantCampaignId,
      tenantId,
      createdBy,
      idMap: idMaps[table],
    });
  }

  /* -----------------------------------------------
     STEP 2: CLONE JOIN TABLES (FILTERED)
  ------------------------------------------------ */
  for (const join of JOIN_TABLES) {
    await cloneJoinTable({
      join,
      idMaps,
    });
  }

  return {
    success: true,
    tenantCampaignId,
  };
}

/* =========================================================
   CORE TABLE DEFINITIONS
========================================================= */
const CORE_TABLES = [
  "sessions",
  "events",
  "npcs",
  "locations",
  "items",
  "encounters",
] as const;

/* =========================================================
   JOIN TABLE DEFINITIONS
========================================================= */
const JOIN_TABLES = [
  { table: "encounter_npcs", left: "encounter_id", right: "npc_id", rightMap: "npcs" },
  { table: "encounter_items", left: "encounter_id", right: "item_id", rightMap: "items" },
  { table: "encounter_locations", left: "encounter_id", right: "location_id", rightMap: "locations" },
  { table: "encounter_events", left: "encounter_id", right: "event_id", rightMap: "events" },
] as const;

/* =========================================================
   CLONE A SINGLE TABLE
========================================================= */
async function cloneTable({
  table,
  templateCampaignId,
  tenantCampaignId,
  tenantId,
  createdBy,
  idMap,
}: {
  table: string;
  templateCampaignId: string;
  tenantCampaignId: string;
  tenantId: string;
  createdBy: string;
  idMap: Map<string, string>;
}) {
  if (!isSafeIdent(table)) throw new Error(`Unsafe table: ${table}`);

  const rowsRes = await query(
    `
    SELECT *
      FROM ${ident(table)}
     WHERE template_campaign_id = $1
    `,
    [templateCampaignId]
  );

  for (const row of rowsRes.rows) {
    const newId = uuidv4();
    idMap.set(row.id, newId);

    // Strip template-only + system fields we don't want to copy verbatim
    const {
      id,
      template_campaign_id,
      campaign_id,
      tenant_id,
      created_by,
      created_at,
      updated_at,
      deleted_at,
      ...data
    } = row;

    // Build dynamic insert
    const dynamicCols = Object.keys(data).filter((k) => isSafeIdent(k));

    const cols = ["id", "campaign_id", "tenant_id", "created_by", ...dynamicCols];
    const params = [
      newId,
      tenantCampaignId,
      tenantId,
      createdBy,
      ...dynamicCols.map((k) => data[k]),
    ];

    const valuesSql = params.map((_, i) => `$${i + 1}`).join(", ");

    await query(
      `
      INSERT INTO ${ident(table)} (${cols.map(ident).join(", ")})
      VALUES (${valuesSql})
      `,
      params
    );
  }
}

/* =========================================================
   CLONE JOIN TABLES (FILTERED + ID-MAPPED)
========================================================= */
async function cloneJoinTable({
  join,
  idMaps,
}: {
  join: {
    table: string;
    left: string; // encounter_id
    right: string;
    rightMap: keyof typeof idMaps;
  };
  idMaps: Record<string, Map<string, string>>;
}) {
  if (!isSafeIdent(join.table)) throw new Error(`Unsafe join table: ${join.table}`);
  if (!isSafeIdent(join.left)) throw new Error(`Unsafe join.left: ${join.left}`);
  if (!isSafeIdent(join.right)) throw new Error(`Unsafe join.right: ${join.right}`);

  // Only clone joins that belong to encounters that were cloned
  const oldEncounterIds = Array.from(idMaps.encounters.keys());
  if (!oldEncounterIds.length) return;

  const rowsRes = await query(
    `
    SELECT *
      FROM ${ident(join.table)}
     WHERE ${ident(join.left)} = ANY($1::uuid[])
    `,
    [oldEncounterIds]
  );

  for (const row of rowsRes.rows) {
    const oldLeftId = row[join.left];
    const oldRightId = row[join.right];

    const newLeftId = idMaps.encounters.get(oldLeftId);
    const newRightId = idMaps[join.rightMap].get(oldRightId);

    if (!newLeftId || !newRightId) {
      continue; // Skip orphaned joins safely
    }

    await query(
      `
      INSERT INTO ${ident(join.table)} (${ident(join.left)}, ${ident(join.right)})
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [newLeftId, newRightId]
    );
  }
}
