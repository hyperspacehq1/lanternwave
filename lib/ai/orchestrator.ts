import { query, buildInsert } from "@/lib/db/db";
import OpenAI from "openai";
import { resolveEncounterRelationships } from "@/lib/ai/resolveEncounterRelationships";

import campaigns from "./schemas/campaigns.v1";
import sessions from "./schemas/sessions.v1";
import events from "./schemas/events.v1";
import npcs from "./schemas/npcs.v1";
import locations from "./schemas/locations.v1";
import items from "./schemas/items.v1";
import encounters from "./schemas/encounters.v1";

const openai = new OpenAI();
const ADMIN_TENANT_ID = "1c6c314c-f33e-4f9f-bb6d-d547a23cbcf9";

const SCHEMA_PIPELINE = [
  campaigns,
  sessions,
  events,
  npcs,
  locations,
  items,
  encounters,
] as const;

export async function ingestAdventureCodex({
  openaiFileId,
  adminUserId,
  onEvent,
}: {
  openaiFileId: string;
  adminUserId: string;
  onEvent?: (e: any) => void;
}) {
  const emit = (stage: string, message: string, meta?: any) =>
    onEvent?.({ stage, message, meta });

  emit("start", "Ingestion started", { openaiFileId, adminUserId });

  const context: Record<string, any[]> = {};
  let rootCampaignId: string | null = null;

  try {
    for (const schemaDef of SCHEMA_PIPELINE) {
      const tableName = schemaDef.name;

      emit("schema_extract_start", `Extracting ${tableName}`, { tableName });

      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "Extract structured RPG data. Return only valid JSON matching the schema. Do not invent data.",
          },
          {
            role: "user",
            content: [
              { type: "input_text", text: `Extract ${tableName} data.` },
              { type: "input_file", file_id: openaiFileId },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",        // ✅ CORRECT
            name: schemaDef.schema.name,
            schema: schemaDef.schema.schema,
          },
        },
      });

      const parsed = response.output_parsed;
      if (!parsed) {
        context[tableName] = [];
        emit("schema_skipped", `Skipped ${tableName}`);
        continue;
      }

      const rows = Array.isArray(parsed) ? parsed : [parsed];
      context[tableName] = rows;

      emit("schema_extract_done", `Extracted ${tableName}`, {
        rows: rows.length,
      });

      const insertedRows: any[] = [];
      for (const row of rows) {
        const insertData = {
          ...row,
          tenant_id: ADMIN_TENANT_ID,
          campaign_id: tableName === "campaigns" ? null : rootCampaignId,
        };

        const { sql, params } = buildInsert({
          table: tableName,
          data: insertData,
        });

        const result = await query(sql, params);
        insertedRows.push(result.rows[0]);
      }

      context[tableName] = insertedRows;

      if (tableName === "campaigns" && insertedRows.length) {
        rootCampaignId = insertedRows[0].id;
        emit("root_campaign_captured", "Captured root campaign", {
          rootCampaignId,
        });
      }
    }

    if (rootCampaignId) {
      emit("resolve_relationships_start", "Resolving relationships");
      await resolveEncounterRelationships({ campaignId: rootCampaignId });
      emit("resolve_relationships_done", "Relationships resolved");
    }

    emit("completed", "Ingestion complete", { rootCampaignId });
    return { success: true, campaignId: rootCampaignId };
  } catch (err: any) {
    emit("error", "Fatal ingest error", {
      message: err.message,
      stack: err.stack,
      rootCampaignId,
    });
    return { success: false, campaignId: rootCampaignId };
  }
}
