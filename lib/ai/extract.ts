// /lib/ai/extract.ts
import OpenAI from "openai";

const openai = new OpenAI();

export async function extractWithSchema({
  tableName,
  schema,
  pdfText,
  context,
}: {
  tableName: string;
  schema: any;
  pdfText: string;
  context: Record<string, any>;
}) {
  const systemPrompt = `
You are extracting structured RPG data.
Return ONLY valid JSON matching the schema.
Do not invent data.
Do not repeat entities.
`;

  const userPrompt = `
PDF CONTENT:
${pdfText}

EXISTING CONTEXT:
${JSON.stringify(context, null, 2)}

TASK:
Extract ${tableName} data.
`;

  const response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    text: {
      format: {
        name: schema.name,
        schema: schema.schema,
      },
    },
  });

  return response.output_parsed;
}
