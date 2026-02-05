import { query } from "@/lib/db";
import { promises as fs } from "fs";
import path from "path";
import { getCampaignTemplate } from "@/lib/campaignTemplates";

/**
 * Apply a campaign template to an existing campaign
 * @param {string} tenantId - The tenant ID
 * @param {string} campaignId - The campaign ID to populate
 * @param {string} templateKey - The template key (filename or "standard")
 */
export async function applyTemplate(tenantId, campaignId, templateKey) {
  // Standard template = no import needed
  if (templateKey === "standard") {
    return { ok: true, message: "Standard campaign (no template)" };
  }

  // Get template info
  const template = getCampaignTemplate(templateKey);
  if (!template || !template.filename) {
    throw new Error(`Invalid template key: ${templateKey}`);
  }

  // Read template file
  const importsDir = path.join(process.cwd(), "imports");
  const templatePath = path.join(importsDir, template.filename);
  
  const fileContent = await fs.readFile(templatePath, "utf-8");
  const templateData = JSON.parse(fileContent);

  // ID mapping to track old IDs -> new IDs
  const idMap = {
    sessions: {},
    encounters: {},
    events: {},
    items: {},
    locations: {},
    npcs: {},
  };

  // Helper to generate UUID via database
  const generateId = async () => {
    const result = await query("SELECT gen_random_uuid()::text as id");
    return result.rows[0].id;
  };

  // 1. Import main entity tables
  const entityTables = ['sessions', 'encounters', 'events', 'items', 'locations', 'npcs'];
  
  for (const tableName of entityTables) {
    const entities = templateData[tableName] || [];
    
    for (const entity of entities) {
      const oldId = entity.id;
      const newId = await generateId();
      idMap[tableName][oldId] = newId;

      // Map snake_case fields to handle both formats
      const fieldMap = {
        tenant_id: tenantId,
        campaign_id: campaignId,
        id: newId,
      };

      // Build insert dynamically
      const columns = ['id', 'tenant_id', 'campaign_id'];
      const values = [newId, tenantId, campaignId];

      // Add all data fields from template
      for (const [key, value] of Object.entries(entity)) {
        if (!['id', 'tenant_id', 'campaign_id'].includes(key)) {
          // Convert camelCase to snake_case
          const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          columns.push(snakeKey);
          values.push(value);
        }
      }

      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      await query(
        `INSERT INTO ${tableName} (${columns.join(', ')})
         VALUES (${placeholders})`,
        values
      );
    }
  }

  // 2. Import join tables with mapped IDs
  const joinTables = [
    { name: 'encounter_npcs', entityTypes: ['encounters', 'npcs'] },
    { name: 'session_encounters', entityTypes: ['sessions', 'encounters'] },
    { name: 'session_events', entityTypes: ['sessions', 'events'] },
    { name: 'session_locations', entityTypes: ['sessions', 'locations'] },
    { name: 'location_items', entityTypes: ['locations', 'items'] },
    { name: 'session_items', entityTypes: ['sessions', 'items'] },
    { name: 'location_npcs', entityTypes: ['locations', 'npcs'] },
  ];

  for (const { name: tableName, entityTypes } of joinTables) {
    const joins = templateData[tableName] || [];
    
    for (const join of joins) {
      const newId = await generateId();
      
      // Get foreign key column names
      const fkColumns = Object.keys(join).filter(k => 
        k.endsWith('_id') && !['id', 'tenant_id'].includes(k)
      );
      
      // Map old IDs to new IDs
      const values = [newId, tenantId];
      const columns = ['id', 'tenant_id'];
      
      for (const fkCol of fkColumns) {
        const oldId = join[fkCol];
        const entityType = fkCol.replace('_id', '') + 's'; // e.g., 'session_id' -> 'sessions'
        const newFkId = idMap[entityType]?.[oldId];
        
        if (!newFkId) {
          console.warn(`Missing ID mapping for ${tableName}.${fkCol}: ${oldId}`);
          continue; // Skip this join if we can't map the ID
        }
        
        columns.push(fkCol);
        values.push(newFkId);
      }

      if (columns.length > 2) { // Only insert if we have FK columns
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        await query(
          `INSERT INTO ${tableName} (${columns.join(', ')})
           VALUES (${placeholders})`,
          values
        );
      }
    }
  }

  // Return summary
  const summary = {};
  for (const table of [...entityTables, ...joinTables.map(j => j.name)]) {
    summary[table] = (templateData[table] || []).length;
  }

  return {
    ok: true,
    message: "Template applied successfully",
    templateName: template.label,
    imported: summary,
  };
}
