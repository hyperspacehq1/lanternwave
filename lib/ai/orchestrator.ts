import { query, buildInsert } from "@/lib/db/db";
import { runStructuredPrompt } from "@/lib/ai/runStructuredPrompt";
import { resolveEncounterRelationships } from "@/lib/ai/resolveEncounterRelationships";

import campaigns from "./schemas/campaigns.v1";
import sessions from "./schemas/sessions.v1";
import events from "./schemas/events.v1";
import npcs from "./schemas/npcs.v1";
import locations from "./schemas/locations.v1";
import items from "./schemas/items.v1";
import encounters from "./schemas/encounters.v1";

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

emit("start", "Ingestion started", {
  pdfLength: pdfText?.length,
});

export async function ingestAdventureCodex({
  pdfText,
  adminUserId,
  onEvent,
}: {
  pdfText: string;
  adminUserId: string;
  onEvent?: EmitFn;
}) {
  const emit = (stage: IngestStage, message: string, meta?: any) => {
    try {
      onEvent?.({ stage, message, meta });
   } catch (err: any) {
  console.error("❌ INGEST ORCHESTRATOR ERROR", err);

  emit("error", "Fatal ingest error", {
    message: err?.message ?? String(err),
    stack: err?.stack,
  });

  return { success: false, campaignId: rootCampaignId };
}
  };

  emit("start", "Ingestion started");

  const context: Record<string, any[]> = {};
  let rootCampaignId: string | null = null;

  try {
    for (const schemaDef of SCHEMA_PIPELINE) {
      const tableName = schemaDef.name;
      const schema = schemaDef.schema;

      emit("schema_extract_start", `Extracting ${tableName}`, { tableName });

      const aiResult = await runStructuredPrompt({
        model: "gpt-4.1",
        prompt: [
          { role: "system", content: "Extract structured RPG data." },
          { role: "user", content: pdfText },
        ],
        jsonSchema: schemaDef,
        temperature: 0.2,
      });

      if (!aiResult) {
        emit("schema_skipped", `Skipped ${tableName}`, {
          reason: "AI returned no structured output",
        });
        context[tableName] = [];
        continue;
      }

      const rows = Array.isArray(aiResult) ? aiResult : [aiResult];

      if (!rows.length) {
        emit("schema_skipped", `Skipped ${tableName}`, {
          reason: "No rows extracted",
        });
        context[tableName] = [];
        continue;
      }

      emit("schema_extract_done", `Extracted ${tableName}`, {
        tableName,
        rows: rows.length,
      });

      emit("db_insert_start", `Inserting ${tableName}`, {
        tableName,
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
        insertedRows.push(result.rows[0]);

        emit("db_insert_row", `Inserted ${tableName}`, {
          tableName,
          id: result.rows[0]?.id,
        });
      }

      emit("db_insert_done", `Inserted ${tableName}`, {
        tableName,
        inserted: insertedRows.length,
      });

      context[tableName] = insertedRows;

      if (tableName === "campaigns") {
        if (!insertedRows.length) {
          emit("schema_skipped", "Campaign schema produced no rows");
          continue;
        }

        rootCampaignId = insertedRows[0].id;
        emit("root_campaign_captured", "Captured root campaign id", {
          rootCampaignId,
        });
      }
    }

    if (rootCampaignId) {
      emit("resolve_relationships_start", "Resolving encounter relationships");
      await resolveEncounterRelationships({ campaignId: rootCampaignId });
      emit("resolve_relationships_done", "Resolved encounter relationships");
    }

    emit("completed", "Ingestion complete", { rootCampaignId });

    return { success: true, campaignId: rootCampaignId };
  } catch (err: any) {
    emit("error", "Fatal ingest error", {
      message: err?.message ?? String(err),
      rootCampaignId,
    });

    return { success: false, campaignId: rootCampaignId };
  }
}
