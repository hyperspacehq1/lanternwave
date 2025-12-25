import { sql } from "@/lib/db";
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
     STEP 2: CLONE JOIN TABLES
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
  {
    table: "encounter_npcs",
    left: "encounter_id",
    right: "npc_id",
  },
  {
    table: "encounter_items",
    left: "encounter_id",
    right: "item_id",
  },
  {
    table: "encounter_locations",
    left: "encounter_id",
    right: "location_id",
  },
  {
    table: "encounter_events",
    left: "encounter_id",
    right: "event_id",
  },
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
  const rows = await sql`
    SELECT *
    FROM ${sql(table)}
    WHERE template_campaign_id = ${templateCampaignId}
  `;

  for (const row of rows.rows) {
    const newId = uuidv4();
    idMap.set(row.id, newId);

    const {
      id,
      template_campaign_id,
      created_at,
      updated_at,
      ...data
    } = row;

    await sql`
      INSERT INTO ${sql(table)}
      (
        id,
        campaign_id,
        tenant_id,
        created_by,
        ${sql(Object.keys(data))}
      )
      VALUES
      (
        ${newId},
        ${tenantCampaignId},
        ${tenantId},
        ${createdBy},
        ${sql(Object.values(data))}
      )
    `;
  }
}

/* =========================================================
   CLONE JOIN TABLES
========================================================= */
async function cloneJoinTable({
  join,
  idMaps,
}: {
  join: {
    table: string;
    left: string;
    right: string;
  };
  idMaps: Record<string, Map<string, string>>;
}) {
  const rows = await sql`
    SELECT *
    FROM ${sql(join.table)}
  `;

  for (const row of rows.rows) {
    const oldLeftId = row[join.left];
    const oldRightId = row[join.right];

    const newLeftId =
      idMaps.encounters.get(oldLeftId) ||
      idMaps[join.left.replace("_id", "s")]?.get(oldLeftId);

    const newRightId =
      idMaps[join.right.replace("_id", "s")]?.get(oldRightId);

    if (!newLeftId || !newRightId) {
      continue; // Skip orphaned joins safely
    }

    await sql`
      INSERT INTO ${sql(join.table)}
      (${sql(join.left)}, ${sql(join.right)})
      VALUES (${newLeftId}, ${newRightId})
      ON CONFLICT DO NOTHING
    `;
  }
}
