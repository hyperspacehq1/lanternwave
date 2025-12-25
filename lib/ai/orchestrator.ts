import OpenAI from "openai";
import { sql } from "@/lib/db";

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

/* ================================
   OPENAI CLIENT
================================ */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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

  for (const schemaDef of SCHEMA_PIPELINE) {
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
      const result = await sql`
        INSERT INTO ${sql(tableName)}
        (${sql(Object.keys(row))},
         template_campaign_id,
         created_by)
        VALUES (
          ${sql(Object.values(row))},
          ${templateCampaignId},
          ${adminUserId}
        )
        RETURNING *
      `;

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

EXISTING EXTRACTED DATA:
${JSON.stringify(context, null, 2)}

TASK:
Extract "${tableName}" data from the PDF.
`;

  const response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    text: {
      format: {
        name: tableName,
        schema,
      },
    },
  });

  return response.output_parsed;
}
