import { query, ident, isSafeIdent } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

/* =========================================================
   CLONE ADVENTURE CODEX → TENANT
========================================================= */

export async function cloneAdventureCodexToTenant({
  templateCampaignId,
  tenantCampaignId,
  tenantId,
}: {
  templateCampaignId: string;
  tenantCampaignId: string;
  tenantId: string;
}) {
  if (!templateCampaignId || !tenantCampaignId || !tenantId) {
    throw new Error("Missing required parameters");
  }

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
      idMap: idMaps[table],
    });
  }

  for (const join of JOIN_TABLES) {
    await cloneJoinTable({ join, idMaps });
  }

  return { success: true, tenantCampaignId };
}

/* =========================================================
   TABLE DEFINITIONS
========================================================= */

const CORE_TABLES = [
  "campaigns",
  "sessions",
  "events",
  "npcs",
  "locations",
  "items",
  "encounters",
] as const;

const JOIN_TABLES = [
  { table: "session_events", left: "session_id", right: "event_id", rightMap: "events" },
  { table: "session_npcs", left: "session_id", right: "npc_id", rightMap: "npcs" },
  { table: "session_locations", left: "session_id", right: "location_id", rightMap: "locations" },
  { table: "session_items", left: "session_id", right: "item_id", rightMap: "items" },

  { table: "event_npcs", left: "event_id", right: "npc_id", rightMap: "npcs" },
  { table: "event_locations", left: "event_id", right: "location_id", rightMap: "locations" },
  { table: "event_items", left: "event_id", right: "item_id", rightMap: "items" },

  { table: "encounter_npcs", left: "encounter_id", right: "npc_id", rightMap: "npcs" },
  { table: "encounter_locations", left: "encounter_id", right: "location_id", rightMap: "locations" },
  { table: "encounter_items", left: "encounter_id", right: "item_id", rightMap: "items" },
] as const;

/* =========================================================
   COLUMN INTROSPECTION
========================================================= */

const columnCache = new Map<string, Set<string>>();

async function getTableColumns(table: string): Promise<Set<string>> {
  if (columnCache.has(table)) return columnCache.get(table)!;

  const res = await query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    `,
    [table]
  );

  const cols = new Set(res.rows.map((r: any) => r.column_name));
  columnCache.set(table, cols);
  return cols;
}

/* =========================================================
   CLONE CORE TABLES
========================================================= */

async function cloneTable({
  table,
  templateCampaignId,
  tenantCampaignId,
  idMap,
}: {
  table: string;
  templateCampaignId: string;
  tenantCampaignId: string;
  idMap: Map<string, string>;
}) {
  if (!isSafeIdent(table)) throw new Error(`Unsafe table: ${table}`);

  const tableCols = await getTableColumns(table);

  const sourceRows =
    table === "campaigns"
      ? await query(`SELECT * FROM ${ident(table)} WHERE id = $1`, [templateCampaignId])
      : await query(
          `SELECT * FROM ${ident(table)} WHERE template_campaign_id = $1`,
          [templateCampaignId]
        );

  for (const row of sourceRows.rows) {
    const newId = table === "campaigns" ? tenantCampaignId : uuidv4();
    idMap.set(row.id, newId);

    const {
      id,
      template_campaign_id,
      created_at,
      updated_at,
      search_tsv,
      embedding,
      ...data
    } = row;

    const columns: string[] = ["id"];
    const values: any[] = [newId];

    if (tableCols.has("tenant_id")) {
      columns.push("tenant_id");
      values.push(tenantCampaignId);
    }

    if (table === "campaigns") {
      if (tableCols.has("is_template")) {
        columns.push("is_template");
        values.push(false);
      }
      if (tableCols.has("template_campaign_id")) {
        columns.push("template_campaign_id");
        values.push(templateCampaignId);
      }
    }

    for (const key of Object.keys(data)) {
      if (!tableCols.has(key)) continue;
      columns.push(key);
      values.push(data[key]);
    }

    await query(
      `
      INSERT INTO ${ident(table)} (${columns.map(ident).join(", ")})
      VALUES (${values.map((_, i) => `$${i + 1}`).join(", ")})
      `,
      values
    );
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
    rightMap: keyof typeof idMaps;
  };
  idMaps: {
    campaigns: Map<string, string>;
    sessions: Map<string, string>;
    events: Map<string, string>;
    npcs: Map<string, string>;
    locations: Map<string, string>;
    items: Map<string, string>;
    encounters: Map<string, string>;
  };
}) {
  const { table, left, right, rightMap } = join;

  if (!isSafeIdent(table)) throw new Error(`Unsafe table: ${table}`);

  const rows = await query(
    `SELECT ${ident(left)}, ${ident(right)} FROM ${ident(table)}`,
    []
  );

  for (const row of rows.rows) {
    const leftNew = idMaps[
      left.includes("session")
        ? "sessions"
        : left.includes("event")
        ? "events"
        : left.includes("npc")
        ? "npcs"
        : left.includes("location")
        ? "locations"
        : "items"
    ].get(row[left]);

    const rightNew = idMaps[rightMap].get(row[right]);

    if (!leftNew || !rightNew) continue;

    await query(
      `
      INSERT INTO ${ident(table)} (${ident(left)}, ${ident(right)})
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [leftNew, rightNew]
    );
  }
}
