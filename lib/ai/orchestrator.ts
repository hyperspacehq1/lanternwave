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

/* ───────────────────────────────────────────── */
/* Types */
/* ───────────────────────────────────────────── */

export type IngestStage =
  | "start"
  | "schema_extract_start"
  | "schema_extract_done"
  | "schema_skipped"
  | "db_insert_start"
  | "db_insert_row"
  | "db_insert_done"
  | "root_campaign_captured"
  | "resolve_relationships_start"
  | "resolve_relationships_done"
  | "completed"
  | "error";

export type IngestEvent = {
  stage: IngestStage;
  message: string;
  meta?: Record<string, any>;
};

type EmitFn = (event: IngestEvent) => void;

/* ───────────────────────────────────────────── */
/* Orchestrator */
/* ───────────────────────────────────────────── */

export async function ingestAdventureCodex({
  openaiFileId,
  adminUserId,
  onEvent,
}: {
  openaiFileId: string;
  adminUserId: string;
  onEvent?: EmitFn;
}) {
  const emit = (stage: IngestStage, message: string, meta?: any) => {
    try {
      onEvent?.({ stage, message, meta });
    } catch (err) {
      console.error("❌ INGEST EMIT ERROR", err);
    }
  };

  emit("start", "Ingestion started", {
    openaiFileId,
    adminUserId,
  });

  const context: Record<string, any[]> = {};
  let rootCampaignId: string | null = null;

  try {
    for (const schemaDef of SCHEMA_PIPELINE) {
      const tableName = schemaDef.name;

      emit("schema_extract_start", `Extracting ${tableName}`, {
        tableName,
        source: "openai_file",
      });

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
              {
                type: "input_text",
                text: `Extract ${tableName} data from this RPG PDF.`,
              },
              {
                type: "input_file",
                file_id: openaiFileId,
              },
            ],
          },
        ],
        text: {
          format: {
            name: schemaDef.schema.name,
            schema: schemaDef.schema.schema,
          },
        },
      });

      const parsed = response.output_parsed;

      if (!parsed) {
        emit("schema_skipped", `Skipped ${tableName}`, {
          reason: "No structured output returned",
        });
        context[tableName] = [];
        continue;
      }

      const rows = Array.isArray(parsed) ? parsed : [parsed];

      if (!rows.length) {
        emit("schema_skipped", `Skipped ${tableName}`, {
          reason: "Empty result set",
        });
        context[tableName] = [];
        continue;
      }

      emit("schema_extract_done", `Extracted ${tableName}`, {
        rows: rows.length,
      });

      emit("db_insert_start", `Inserting ${tableName}`, {
        rows: rows.length,
      });

      const insertedRows: any[] = [];

      for (const row of rows) {
        if (!row || typeof row !== "object") continue;

        const insertData: Record<string, any> = {
          ...row,
          tenant_id: ADMIN_TENANT_ID,
        };

        if (tableName === "campaigns") {
          insertData.template_campaign_id = null;
        } else {
          insertData.campaign_id = rootCampaignId;
        }

        const { sql, params } = buildInsert({
          table: tableName,
          data: insertData,
        });

        const result = await query(sql, params);
        const inserted = result.rows[0];

        insertedRows.push(inserted);

        emit("db_insert_row", `Inserted ${tableName}`, {
          tableName,
          id: inserted?.id,
        });
      }

      emit("db_insert_done", `Inserted ${tableName}`, {
        inserted: insertedRows.length,
      });

      context[tableName] = insertedRows;

      if (tableName === "campaigns" && insertedRows.length) {
        rootCampaignId = insertedRows[0].id;
        emit("root_campaign_captured", "Captured root campaign id", {
          rootCampaignId,
        });
      }
    }

    if (rootCampaignId) {
      emit("resolve_relationships_start", "Resolving encounter relationships", {
        campaignId: rootCampaignId,
      });

      await resolveEncounterRelationships({ campaignId: rootCampaignId });

      emit("resolve_relationships_done", "Resolved encounter relationships");
    }

    emit("completed", "Ingestion complete", {
      rootCampaignId,
    });

    return { success: true, campaignId: rootCampaignId };
  } catch (err: any) {
    emit("error", "Fatal ingest error", {
      message: err?.message ?? String(err),
      stack: err?.stack,
      rootCampaignId,
    });

    return { success: false, campaignId: rootCampaignId };
  }
}
