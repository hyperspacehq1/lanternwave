import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   POST /api/admin/json-export/run
   Body: { tenantId, campaignId, isTemplate, templateCampaignId, campaignPackage, uniqueId }
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

    // 2. Export sessions table
    const sessionsResult = await exportTable(
      tenantId, 
      campaignId, 
      "sessions", 
      ["id", "tenant_id", "campaign_id", "name", "description"]
    );
    exportData.sessions = sessionsResult;
    await writeJsonFile(exportDir, `${uniqueId}-sessions.json`, sessionsResult);

    // 3. Export encounters table
    const encountersResult = await exportTable(
      tenantId, 
      campaignId, 
      "encounters", 
      ["id", "tenant_id", "campaign_id", "name", "description", "development"]
    );
    exportData.encounters = encountersResult;
    await writeJsonFile(exportDir, `${uniqueId}-encounters.json`, encountersResult);

    // 4. Export events table
    const eventsResult = await exportTable(
      tenantId, 
      campaignId, 
      "events", 
      ["id", "tenant_id", "campaign_id", "name", "description", "event_type", "priority"]
    );
    exportData.events = eventsResult;
    await writeJsonFile(exportDir, `${uniqueId}-events.json`, eventsResult);

    // 5. Export items table
    const itemsResult = await exportTable(
      tenantId, 
      campaignId, 
      "items", 
      ["id", "tenant_id", "campaign_id", "name", "item_type", "description", "properties"]
    );
    exportData.items = itemsResult;
    await writeJsonFile(exportDir, `${uniqueId}-items.json`, itemsResult);

    // 6. Export locations table
    const locationsResult = await exportTable(
      tenantId, 
      campaignId, 
      "locations", 
      ["id", "tenant_id", "campaign_id", "name", "description", "world", 
       "address_street", "address_city", "address_state", "address_zip", "address_country"]
    );
    exportData.locations = locationsResult;
    await writeJsonFile(exportDir, `${uniqueId}-locations.json`, locationsResult);

    // 7. Export npcs table
    const npcsResult = await exportTable(
      tenantId, 
      campaignId, 
      "npcs", 
      ["id", "tenant_id", "campaign_id", "name", "npc_type", "description", 
       "goals", "faction_alignment", "secrets"]
    );
    exportData.npcs = npcsResult;
    await writeJsonFile(exportDir, `${uniqueId}-npcs.json`, npcsResult);

    // 8. Export encounter_npcs join table
    const encounterNpcsResult = await exportJoinTable(
      tenantId, 
      "encounter_npcs", 
      ["id", "tenant_id", "encounter_id", "npc_id"], 
      campaignId
    );
    exportData.encounter_npcs = encounterNpcsResult;
    await writeJsonFile(exportDir, `${uniqueId}-encounter_npcs.json`, encounterNpcsResult);

    // 9. Export session_encounters join table
    const sessionEncountersResult = await exportJoinTable(
      tenantId, 
      "session_encounters", 
      ["id", "tenant_id", "session_id", "encounter_id"], 
      campaignId
    );
    exportData.session_encounters = sessionEncountersResult;
    await writeJsonFile(exportDir, `${uniqueId}-session_encounters.json`, sessionEncountersResult);

    // 10. Export session_events join table
    const sessionEventsResult = await exportJoinTable(
      tenantId, 
      "session_events", 
      ["id", "tenant_id", "session_id", "event_id"], 
      campaignId
    );
    exportData.session_events = sessionEventsResult;
    await writeJsonFile(exportDir, `${uniqueId}-session_events.json`, sessionEventsResult);

    // 11. Export session_locations join table
    const sessionLocationsResult = await exportJoinTable(
      tenantId, 
      "session_locations", 
      ["id", "tenant_id", "session_id", "location_id"], 
      campaignId
    );
    exportData.session_locations = sessionLocationsResult;
    await writeJsonFile(exportDir, `${uniqueId}-session_locations.json`, sessionLocationsResult);

    // 12. Export location_items join table
    const locationItemsResult = await exportJoinTable(
      tenantId, 
      "location_items", 
      ["id", "tenant_id", "location_id", "item_id"], 
      campaignId
    );
    exportData.location_items = locationItemsResult;
    await writeJsonFile(exportDir, `${uniqueId}-location_items.json`, locationItemsResult);

    // 13. Export session_items join table
    const sessionItemsResult = await exportJoinTable(
      tenantId, 
      "session_items", 
      ["id", "tenant_id", "session_id", "item_id"], 
      campaignId
    );
    exportData.session_items = sessionItemsResult;
    await writeJsonFile(exportDir, `${uniqueId}-session_items.json`, sessionItemsResult);

    // 14. Export location_npcs join table
    const locationNpcsResult = await exportJoinTable(
      tenantId, 
      "location_npcs", 
      ["id", "tenant_id", "location_id", "npc_id"], 
      campaignId
    );
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

  // Add/override the template fields
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
  // Convert columns to proper SQL with type casting for UUIDs
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
   Helper: Export a join table
   Note: Join tables don't have campaign_id, so we need to 
   find records that belong to entities in this campaign
------------------------------------------------------------ */
async function exportJoinTable(tenantId, tableName, columns, campaignId) {
  // Convert columns to proper SQL with type casting for UUIDs
  const columnList = columns.map(col => {
    if (col.includes('_id') || col === 'id') {
      return `jt.${col}::text AS ${col}`;
    }
    return `jt.${col}`;
  }).join(", ");
  
  // Different strategies based on the table
  let queryStr;
  let params;
  
  if (tableName === "encounter_npcs") {
    queryStr = `
      SELECT ${columnList}
      FROM ${tableName} jt
      WHERE jt.tenant_id = $1 
        AND jt.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM encounters e 
          WHERE e.id = jt.encounter_id 
            AND e.campaign_id = $2 
            AND e.deleted_at IS NULL
        )
    `;
    params = [tenantId, campaignId];
  }
  else if (tableName === "session_encounters") {
    queryStr = `
      SELECT ${columnList}
      FROM ${tableName} jt
      WHERE jt.tenant_id = $1 
        AND jt.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM sessions s 
          WHERE s.id = jt.session_id 
            AND s.campaign_id = $2 
            AND s.deleted_at IS NULL
        )
    `;
    params = [tenantId, campaignId];
  }
  else if (tableName === "session_events") {
    queryStr = `
      SELECT ${columnList}
      FROM ${tableName} jt
      WHERE jt.tenant_id = $1 
        AND jt.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM sessions s 
          WHERE s.id = jt.session_id 
            AND s.campaign_id = $2 
            AND s.deleted_at IS NULL
        )
    `;
    params = [tenantId, campaignId];
  }
  else if (tableName === "session_locations") {
    queryStr = `
      SELECT ${columnList}
      FROM ${tableName} jt
      WHERE jt.tenant_id = $1 
        AND jt.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM sessions s 
          WHERE s.id = jt.session_id 
            AND s.campaign_id = $2 
            AND s.deleted_at IS NULL
        )
    `;
    params = [tenantId, campaignId];
  }
  else if (tableName === "location_items") {
    queryStr = `
      SELECT ${columnList}
      FROM ${tableName} jt
      WHERE jt.tenant_id = $1 
        AND jt.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM locations l 
          WHERE l.id = jt.location_id 
            AND l.campaign_id = $2 
            AND l.deleted_at IS NULL
        )
    `;
    params = [tenantId, campaignId];
  }
  else if (tableName === "session_items") {
    queryStr = `
      SELECT ${columnList}
      FROM ${tableName} jt
      WHERE jt.tenant_id = $1 
        AND jt.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM sessions s 
          WHERE s.id = jt.session_id 
            AND s.campaign_id = $2 
            AND s.deleted_at IS NULL
        )
    `;
    params = [tenantId, campaignId];
  }
  else if (tableName === "location_npcs") {
    queryStr = `
      SELECT ${columnList}
      FROM ${tableName} jt
      WHERE jt.tenant_id = $1 
        AND jt.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM locations l 
          WHERE l.id = jt.location_id 
            AND l.campaign_id = $2 
            AND l.deleted_at IS NULL
        )
    `;
    params = [tenantId, campaignId];
  }
  else {
    // Fallback - just get by tenant
    queryStr = `SELECT ${columnList} FROM ${tableName} jt WHERE jt.tenant_id = $1 AND jt.deleted_at IS NULL`;
    params = [tenantId];
  }
  
  const { rows } = await query(queryStr, params);
  return rows;
}

/* -----------------------------------------------------------
   Helper: Write JSON file
------------------------------------------------------------ */
async function writeJsonFile(dir, filename, data) {
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), "utf-8");
}
