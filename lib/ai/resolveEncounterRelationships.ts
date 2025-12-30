import { query, ident, isSafeIdent } from "@/lib/db/db";

/* =========================================================
   PUBLIC ENTRY POINT
========================================================= */
export async function resolveEncounterRelationships({
  templateCampaignId,
}: {
  templateCampaignId: string;
}) {
  if (!templateCampaignId) {
    throw new Error("templateCampaignId is required");
  }

  const encounters = await getEncounters(templateCampaignId);

  const npcLookup = await buildLookup("npcs", templateCampaignId);
  const itemLookup = await buildLookup("items", templateCampaignId);
  const locationLookup = await buildLookup("locations", templateCampaignId);
  const eventLookup = await buildLookup("events", templateCampaignId);

  for (const encounter of encounters) {
    await linkEntities({
      encounterId: encounter.id,
      names: encounter.related_npcs,
      lookup: npcLookup,
      joinTable: "encounter_npcs",
      joinColumn: "npc_id",
    });

    await linkEntities({
      encounterId: encounter.id,
      names: encounter.related_items,
      lookup: itemLookup,
      joinTable: "encounter_items",
      joinColumn: "item_id",
    });

    await linkEntities({
      encounterId: encounter.id,
      names: encounter.related_locations,
      lookup: locationLookup,
      joinTable: "encounter_locations",
      joinColumn: "location_id",
    });

    await linkEntities({
      encounterId: encounter.id,
      names: encounter.related_events,
      lookup: eventLookup,
      joinTable: "encounter_events",
      joinColumn: "event_id",
    });
  }

  return {
    success: true,
    encountersProcessed: encounters.length,
  };
}

/* =========================================================
   LOAD ENCOUNTERS
========================================================= */
async function getEncounters(templateCampaignId: string) {
  const result = await query(
    `
    SELECT *
      FROM encounters
     WHERE template_campaign_id = $1
    `,
    [templateCampaignId]
  );

  return result.rows;
}

/* =========================================================
   BUILD NAME → ID LOOKUP
========================================================= */
async function buildLookup(
  table: string,
  templateCampaignId: string
): Promise<Map<string, string>> {
  if (!isSafeIdent(table)) throw new Error(`Unsafe table: ${table}`);

  const result = await query(
    `
    SELECT id, name
      FROM ${ident(table)}
     WHERE template_campaign_id = $1
    `,
    [templateCampaignId]
  );

  const map = new Map<string, string>();

  for (const row of result.rows) {
    const key = normalizeName(row.name);

    if (map.has(key)) {
      throw new Error(
        `Duplicate normalized name "${row.name}" detected in table "${table}"`
      );
    }

    map.set(key, row.id);
  }

  return map;
}

/* =========================================================
   LINK ENTITIES (IDEMPOTENT)
========================================================= */
async function linkEntities({
  encounterId,
  names,
  lookup,
  joinTable,
  joinColumn,
}: {
  encounterId: string;
  names?: string[];
  lookup: Map<string, string>;
  joinTable: string;
  joinColumn: string;
}) {
  if (!names || !Array.isArray(names) || names.length === 0) return;
  if (!isSafeIdent(joinTable)) throw new Error(`Unsafe join table: ${joinTable}`);
  if (!isSafeIdent(joinColumn)) throw new Error(`Unsafe join column: ${joinColumn}`);

  for (const rawName of names) {
    const normalized = normalizeName(rawName);
    const entityId = lookup.get(normalized);

    if (!entityId) {
      throw new Error(
        `Encounter ${encounterId} references missing entity "${rawName}" in ${joinTable}`
      );
    }

    await query(
      `
      INSERT INTO ${ident(joinTable)} (encounter_id, ${ident(joinColumn)})
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [encounterId, entityId]
    );
  }
}

/* =========================================================
   NAME NORMALIZATION
========================================================= */
function normalizeName(name: string): string {
  return String(name)
    .toLowerCase()
    .replace(/[’'"]/g, "") // quotes
    .replace(/[^\w\s]/g, "") // punctuation
    .replace(/\s+/g, " ") // whitespace
    .trim();
}
