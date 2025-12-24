import { openai } from "@/lib/ai/client";

function tryJsonParse(s) {
  if (typeof s !== "string") return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/**
 * Runs a prompt expecting strict JSON Schema output.
 * Returns the parsed object, or throws an error with a useful message.
 */
export async function runStructuredPrompt({
  model,
  prompt,
  jsonSchema,
  temperature = 0.7,
}) {
  // Prefer Responses API (2025 standard)
  const response = await openai.responses.create({
    model,
    input: prompt,
    temperature,
    response_format: {
      type: "json_schema",
      json_schema: jsonSchema,
    },
  });

  // The SDK has evolved; handle multiple possible shapes safely.

  // 1) Best case: SDK provides a parsed object
  if (response && typeof response.output_parsed === "object" && response.output_parsed) {
    return response.output_parsed;
  }

  // 2) Some SDK versions expose output_text (string)
  if (typeof response?.output_text === "string") {
    const parsed = tryJsonParse(response.output_text);
    if (parsed) return parsed;
  }

  // 3) Fallback: inspect output array for a text blob
  const output = response?.output;
  if (Array.isArray(output)) {
    // Look for any content items that might contain JSON text
    for (const item of output) {
      const content = item?.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          const text = c?.text || c?.content || c?.value;
          const parsed = tryJsonParse(text);
          if (parsed) return parsed;
        }
      }
      const parsed = tryJsonParse(item?.text);
      if (parsed) return parsed;
    }
  }

  const err = new Error("OpenAI returned unparseable JSON output");
  err.detail = response;
  throw err;
}
