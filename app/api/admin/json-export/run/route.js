import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   POST /api/admin/json-export/run
   Body: { tenantId, campaignId, isTemplate, templateCampaignId, campaignPackage, uniqueId }
   NOW EXPORTS campaign_id IN JOIN TABLES
------------------------------------------------------------ */
export async function POST(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { tenantId, campaignId, isTemplate, templateCampaignId, campaignPackage, uniqueId } = body;

  if (!tenantId || !campaignId || !uniqueId) {
    return Response.json(
      { error: "tenantId, campaignId, and uniqueId are required" },
      { status: 400 }
    );
  }

  const exportDir = path.join(process.cwd(), "exports");
  
  // Ensure exports directory exists
  try {
    await fs.mkdir(exportDir, { recursive: true });
  } catch (err) {
    console.error("Failed to create exports directory:", err);
  }

  try {
    const exportData = {};

    // 1. Export campaigns table
    const campaignsResult = await exportCampaigns(tenantId, campaignId, isTemplate, templateCampaignId, campaignPackage);
    exportData.campaigns = campaignsResult;
    await writeJsonFile(exportDir, `${uniqueId}-campaigns.json`, campaignsResult);

    // 2-7. Export main entity tables
    const sessionsResult = await exportTable(tenantId, campaignId, "sessions", 
      ["id", "tenant_id", "campaign_id", "name", "description"]);
    exportData.sessions = sessionsResult;
    await writeJsonFile(exportDir, `${uniqueId}-sessions.json`, sessionsResult);

    const encountersResult = await exportTable(tenantId, campaignId, "encounters",
      ["id", "tenant_id", "campaign_id", "name", "description", "development"]);
    exportData.encounters = encountersResult;
    await writeJsonFile(exportDir, `${uniqueId}-encounters.json`, encountersResult);

    const eventsResult = await exportTable(tenantId, campaignId, "events",
      ["id", "tenant_id", "campaign_id", "name", "description", "event_type", "priority"]);
    exportData.events = eventsResult;
    await writeJsonFile(exportDir, `${uniqueId}-events.json`, eventsResult);

    const itemsResult = await exportTable(tenantId, campaignId, "items",
      ["id", "tenant_id", "campaign_id", "name", "item_type", "description", "properties"]);
    exportData.items = itemsResult;
    await writeJsonFile(exportDir, `${uniqueId}-items.json`, itemsResult);

    const locationsResult = await exportTable(tenantId, campaignId, "locations",
      ["id", "tenant_id", "campaign_id", "name", "description", "world", 
       "address_street", "address_city", "address_state", "address_zip", "address_country"]);
    exportData.locations = locationsResult;
    await writeJsonFile(exportDir, `${uniqueId}-locations.json`, locationsResult);

    const npcsResult = await exportTable(tenantId, campaignId, "npcs",
      ["id", "tenant_id", "campaign_id", "name", "npc_type", "description", 
       "goals", "faction_alignment", "secrets"]);
    exportData.npcs = npcsResult;
    await writeJsonFile(exportDir, `${uniqueId}-npcs.json`, npcsResult);

    // 8-14. Export join tables - NOW WITH campaign_id!
    const encounterNpcsResult = await exportJoinTableSimple(tenantId, campaignId, "encounter_npcs",
      ["id", "tenant_id", "campaign_id", "encounter_id", "npc_id"]);
    exportData.encounter_npcs = encounterNpcsResult;
    await writeJsonFile(exportDir, `${uniqueId}-encounter_npcs.json`, encounterNpcsResult);

    const sessionEncountersResult = await exportJoinTableSimple(tenantId, campaignId, "session_encounters",
      ["id", "tenant_id", "campaign_id", "session_id", "encounter_id"]);
    exportData.session_encounters = sessionEncountersResult;
    await writeJsonFile(exportDir, `${uniqueId}-session_encounters.json`, sessionEncountersResult);

    const sessionEventsResult = await exportJoinTableSimple(tenantId, campaignId, "session_events",
      ["id", "tenant_id", "campaign_id", "session_id", "event_id"]);
    exportData.session_events = sessionEventsResult;
    await writeJsonFile(exportDir, `${uniqueId}-session_events.json`, sessionEventsResult);

    const sessionLocationsResult = await exportJoinTableSimple(tenantId, campaignId, "session_locations",
      ["id", "tenant_id", "campaign_id", "session_id", "location_id"]);
    exportData.session_locations = sessionLocationsResult;
    await writeJsonFile(exportDir, `${uniqueId}-session_locations.json`, sessionLocationsResult);

    const locationItemsResult = await exportJoinTableSimple(tenantId, campaignId, "location_items",
      ["id", "tenant_id", "campaign_id", "location_id", "item_id"]);
    exportData.location_items = locationItemsResult;
    await writeJsonFile(exportDir, `${uniqueId}-location_items.json`, locationItemsResult);

    const sessionItemsResult = await exportJoinTableSimple(tenantId, campaignId, "session_items",
      ["id", "tenant_id", "campaign_id", "session_id", "item_id"]);
    exportData.session_items = sessionItemsResult;
    await writeJsonFile(exportDir, `${uniqueId}-session_items.json`, sessionItemsResult);

    const locationNpcsResult = await exportJoinTableSimple(tenantId, campaignId, "location_npcs",
      ["id", "tenant_id", "campaign_id", "location_id", "npc_id"]);
    exportData.location_npcs = locationNpcsResult;
    await writeJsonFile(exportDir, `${uniqueId}-location_npcs.json`, locationNpcsResult);

    // Create the master combined JSON file
    const masterFilename = `${uniqueId}-campaign.json`;
    await writeJsonFile(exportDir, masterFilename, exportData);

    // Log the export
    await query(
      `INSERT INTO export_history (tenant_id, campaign_id, unique_id, filename, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [tenantId, campaignId, uniqueId, masterFilename]
    );

    return Response.json({
      ok: true,
      filename: masterFilename,
      filesCreated: 15, // 14 individual + 1 master
      summary: {
        campaigns: campaignsResult.length,
        sessions: sessionsResult.length,
        encounters: encountersResult.length,
        events: eventsResult.length,
        items: itemsResult.length,
        locations: locationsResult.length,
        npcs: npcsResult.length,
        encounter_npcs: encounterNpcsResult.length,
        session_encounters: sessionEncountersResult.length,
        session_events: sessionEventsResult.length,
        session_locations: sessionLocationsResult.length,
        location_items: locationItemsResult.length,
        session_items: sessionItemsResult.length,
        location_npcs: locationNpcsResult.length,
      }
    });
  } catch (e) {
    console.error("Export error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   Helper: Export campaigns table with special handling
------------------------------------------------------------ */
async function exportCampaigns(tenantId, campaignId, isTemplate, templateCampaignId, campaignPackage) {
  const { rows } = await query(
    `SELECT id::text, tenant_id::text, name, description, world_setting, 
            campaign_date, campaign_package, rpg_game
     FROM campaigns
     WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [tenantId, campaignId]
  );

  if (rows.length === 0) {
    throw new Error("Campaign not found");
  }

  return rows.map(row => ({
    ...row,
    is_template: isTemplate,
    template_campaign_id: isTemplate ? templateCampaignId : null,
    campaign_package: isTemplate ? campaignPackage : row.campaign_package,
  }));
}

/* -----------------------------------------------------------
   Helper: Export a standard table
------------------------------------------------------------ */
async function exportTable(tenantId, campaignId, tableName, columns) {
  const columnList = columns.map(col => {
    if (col.includes('_id') || col === 'id') {
      return `${col}::text AS ${col}`;
    }
    return col;
  }).join(", ");

  const { rows } = await query(
    `SELECT ${columnList}
     FROM ${tableName}
     WHERE tenant_id = $1 AND campaign_id = $2 AND deleted_at IS NULL`,
    [tenantId, campaignId]
  );

  return rows;
}

/* -----------------------------------------------------------
   Helper: Export join table (SIMPLIFIED - now uses campaign_id!)
------------------------------------------------------------ */
async function exportJoinTableSimple(tenantId, campaignId, tableName, columns) {
  const columnList = columns.map(col => {
    if (col.includes('_id') || col === 'id') {
      return `${col}::text AS ${col}`;
    }
    return col;
  }).join(", ");
  
  // Much simpler now - just filter by campaign_id!
  const { rows } = await query(
    `SELECT ${columnList}
     FROM ${tableName}
     WHERE tenant_id = $1 AND campaign_id = $2 AND deleted_at IS NULL`,
    [tenantId, campaignId]
  );
  
  return rows;
}

/* -----------------------------------------------------------
   Helper: Write JSON file
------------------------------------------------------------ */
async function writeJsonFile(dir, filename, data) {
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), "utf-8");
}
