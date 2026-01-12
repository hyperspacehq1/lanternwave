import OpenAI from "openai";

const openai = new OpenAI();

/**
 * 2025-grade structured extraction.
 * We DO NOT send raw PDF text.
 * We reference the uploaded file directly.
 */
export async function extractWithSchema({
  tableName,
  schema,
  fileId,
  context,
}: {
  tableName: string;
  schema: any;
  fileId: string;
  context: Record<string, any>;
}) {
  const systemPrompt = `
You are extracting structured RPG data from a PDF.

Rules:
- Return ONLY valid JSON matching the schema.
- Do NOT invent data.
- Do NOT repeat entities.
- If data is not present, omit it.
`;

  const userPrompt = `
TASK:
Extract ${tableName} data from the attached PDF.

EXISTING CONTEXT:
${JSON.stringify(context, null, 2)}
`;

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: [
          { type: "input_text", text: userPrompt },
          { type: "input_file", file_id: fileId },
        ],
      },
    ],
    text: {
      format: {
        name: schema.name,
        schema: schema.schema,
      },
    },
  });

  const parsed = response.output_parsed;

  if (!parsed) return [];

  return Array.isArray(parsed) ? parsed : [parsed];
}
