import { query, buildInsert, ident } from "@/lib/db/db";
import { runStructuredPrompt } from "@/lib/ai/runStructuredPrompt";
import { resolveEncounterRelationships } from "@/lib/ai/resolveEncounterRelationships";

/* ================================
   SCHEMA IMPORTS
================================ */
import campaigns from "./schemas/campaigns.v1";
import sessions from "./schemas/sessions.v1";
import events from "./schemas/events.v1";
import npcs from "./schemas/npcs.v1";
import locations from "./schemas/locations.v1";
import items from "./schemas/items.v1";
import encounters from "./schemas/encounters.v1";

/* ================================
   PIPELINE ORDER (DO NOT CHANGE)
================================ */
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

/* ================================
   MAIN ORCHESTRATOR
================================ */
export async function ingestAdventureCodex({
  pdfText,
  adminUserId,
}: {
  pdfText: string;
  adminUserId: string;
}) {
  const context: Record<string, any[]> = {};
  let templateCampaignId: string | null = null;

  for (const schemaDef of SCHEMA_PIPELINE as unknown as SchemaDef[]) {
    const tableName = schemaDef.name;
    const schema = schemaDef.schema;

    /* ----------------------------
       AI EXTRACTION
    ----------------------------- */
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

    /* ----------------------------
       DB INSERT (TEMPLATE MODE)
    ----------------------------- */
    const insertedRows: any[] = [];

    for (const row of rows) {
      if (!row || typeof row !== "object") continue;

      // Attach template metadata
      const insertData: Record<string, any> = {
        ...row,
        template_campaign_id: templateCampaignId, // null for the root campaign insert
        created_by: adminUserId,
      };

      // (Optional) If your schema outputs camelCase but DB is snake_case,
      // do mapping here. (Leaving as-is per your existing pipeline.)

      const { sql, params } = buildInsert({
        table: tableName,
        data: insertData,
      });

      const result = await query(sql, params);
      insertedRows.push(result.rows[0]);
    }

    context[tableName] = insertedRows;

    /* ----------------------------
       CAPTURE ROOT CAMPAIGN ID
    ----------------------------- */
    if (tableName === "campaigns") {
      if (!insertedRows.length) {
        throw new Error("Campaign schema returned no rows");
      }
      templateCampaignId = insertedRows[0].id;
    }
  }

  /* ----------------------------
     RESOLVE ENCOUNTER RELATIONSHIPS
  ----------------------------- */
  if (templateCampaignId) {
    await resolveEncounterRelationships({ templateCampaignId });
  }

  return {
    success: true,
    templateCampaignId,
  };
}

/* ================================
   AI EXTRACTION HELPER
================================ */
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

Rules:
- Return ONLY JSON matching the schema
- Do not invent data
- Do not duplicate entities
- Use names consistently
- Omit anything not present in the module
`;

  const userPrompt = `
PDF CONTENT:
${pdfText}

EXISTING EXTRACTED DATA (already inserted):
${JSON.stringify(context, null, 2)}

TASK:
Extract "${tableName}" data from the PDF.
`;

  // Uses your Responses API wrapper that already does:
  // text.format.type = "json_schema"
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
