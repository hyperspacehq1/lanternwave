import { openai } from "@/lib/ai/client";

function tryJsonParse(value) {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function runStructuredPrompt({
  model,
  prompt,
  jsonSchema,
  temperature = 0.7,
}) {
  const response = await openai.responses.create({
    model,
    input: prompt,
    temperature,
    text: {
      format: {
        type: "json_schema",           // ✅ CORRECT
        name: jsonSchema.name,
        schema: jsonSchema.schema,
      },
    },
  });

  if (response?.output_parsed) {
    return response.output_parsed;
  }

  if (typeof response?.output_text === "string") {
    const parsed = tryJsonParse(response.output_text);
    if (parsed) return parsed;
  }

  const output = response?.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const parsed = tryJsonParse(item?.text || item?.value);
      if (parsed) return parsed;
    }
  }

  throw new Error("OpenAI returned unparseable JSON output");
}
