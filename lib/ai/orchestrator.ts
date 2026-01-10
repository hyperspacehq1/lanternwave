import { query, buildInsert, ident } from "@/lib/db/db";
import { runStructuredPrompt } from "@/lib/ai/runStructuredPrompt";
import { resolveEncounterRelationships } from "@/lib/ai/resolveEncounterRelationships";

import campaigns from "./schemas/campaigns.v1";
import sessions from "./schemas/sessions.v1";
import events from "./schemas/events.v1";
import npcs from "./schemas/npcs.v1";
import locations from "./schemas/locations.v1";
import items from "./schemas/items.v1";
import encounters from "./schemas/encounters.v1";

const SCHEMA_PIPELINE = [
  campaigns,
  sessions,
  events,
  npcs,
  locations,
  items,
  encounters,
] as const;

type SchemaDef = {
  name: string;
  schema: any;
};

/* ============================================================
   OPTION A — STAGE CALLBACKS (IN-MEMORY)
============================================================ */

export type IngestStage =
  | "start"
  | "schema_extract_start"
  | "schema_extract_done"
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

/* ============================================================
   CANONICAL ORCHESTRATOR (UNCHANGED LOGIC)
============================================================ */

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
    } catch {
      // telemetry must never break ingestion
    }
  };

  emit("start", "Ingestion started");

  const context: Record<string, any[]> = {};
  let templateCampaignId: string | null = null;

  try {
    for (const schemaDef of SCHEMA_PIPELINE as unknown as SchemaDef[]) {
      const tableName = schemaDef.name;
      const schema = schemaDef.schema;

      emit("schema_extract_start", `Extracting ${tableName}`, { tableName });

      const aiResult = await extractWithSchema({
        tableName,
        schema,
        pdfText,
        context,
      });

      if (!aiResult) {
        throw new Error(`AI extraction failed for ${tableName}`);
      }

      const rows = Array.isArray(aiResult) ? aiResult : [aiResult];

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
  template_campaign_id: templateCampaignId,
};

        const { sql, params } = buildInsert({
          table: tableName,
          data: insertData,
        });

        const result = await query(sql, params);
        insertedRows.push(result.rows[0]);

        emit("db_insert_row", `Inserted row into ${tableName}`, {
          tableName,
          id: result?.rows?.[0]?.id,
        });
      }

      emit("db_insert_done", `Inserted ${tableName}`, {
        tableName,
        inserted: insertedRows.length,
      });

      context[tableName] = insertedRows;

      if (tableName === "campaigns") {
        if (!insertedRows.length) {
          throw new Error("Campaign schema returned no rows");
        }

        templateCampaignId = insertedRows[0].id;

        emit("root_campaign_captured", "Captured template campaign id", {
          templateCampaignId,
        });
      }
    }

    if (templateCampaignId) {
      emit(
        "resolve_relationships_start",
        "Resolving encounter relationships",
        { templateCampaignId }
      );

      await resolveEncounterRelationships({ templateCampaignId });

      emit(
        "resolve_relationships_done",
        "Resolved encounter relationships",
        { templateCampaignId }
      );
    }

    emit("completed", "Ingestion complete", { templateCampaignId });

    return {
      success: true,
      templateCampaignId,
    };
  } catch (err: any) {
    emit("error", "Fatal ingest error", {
      message: err?.message ?? String(err),
      templateCampaignId,
    });
    throw err;
  }
}

/* ============================================================
   AI EXTRACTION (UNCHANGED)
============================================================ */

async function extractWithSchema({
  tableName,
  schema,
  pdfText,
  context,
}: {
  tableName: string;
  schema: any;
  pdfText: string;
  context: Record<string, any[]>;
}) {
  const systemPrompt = `
You are an RPG module ingestion engine.

GENERAL RULES:
- Return ONLY JSON matching the provided schema.
- Do not invent entities, characters, locations, or events.
- Do not duplicate entities.
- Use names consistently across all extracted tables.
- Omit anything not present in the module text.
- Use null for unknown or unspecified values.

CAMPAIGN DATE & ERA RULES (CRITICAL):
- campaign_date MUST ONLY be populated if an explicit calendar date or year
  is directly stated in the PDF text.
- If no explicit date or year exists, campaign_date MUST be null.
- NEVER guess or infer a calendar date.

- world_setting is used to describe the era, time period, or setting in
  natural language (e.g. "late medieval fantasy",
  "industrial-era gothic horror",
  "far-future spacefaring civilization").
- world_setting may be null if no clear era or setting can be determined.

- DO NOT encode era information into campaign_date.
- DO NOT invent historical or future dates under any circumstances.
`;

  const userPrompt = `
PDF CONTENT:
${pdfText}

EXISTING EXTRACTED DATA (already inserted):
${JSON.stringify(context, null, 2)}

TASK:
Extract "${tableName}" data from the PDF according to the schema.
`;

  return await runStructuredPrompt({
    model: "gpt-4.1",
    prompt: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    jsonSchema: { name: tableName, schema },
    temperature: 0.2,
  });
}
