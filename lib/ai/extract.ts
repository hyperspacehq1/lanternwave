import OpenAI from "openai";

const openai = new OpenAI();

// conservative, safe size for structured extraction
const MAX_CHARS = 12_000;

function chunkText(text: string, maxChars = MAX_CHARS) {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    chunks.push(text.slice(start, start + maxChars));
    start += maxChars;
  }

  return chunks;
}

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

  const chunks = chunkText(pdfText);

  const results: any[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const userPrompt = `
PDF CONTENT (PART ${i + 1} of ${chunks.length}):

${chunks[i]}

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

    const parsed = response.output_parsed;
    if (parsed) {
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else {
        results.push(parsed);
      }
    }
  }

  // dedupe by JSON identity (simple + safe)
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = JSON.stringify(r);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
