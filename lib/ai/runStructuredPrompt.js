import { openai } from "@/lib/ai/client";

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */
function tryJsonParse(value) {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/* -------------------------------------------------
   runStructuredPrompt
-------------------------------------------------- */
/**
 * Runs a prompt expecting strict JSON Schema output.
 * Fully compliant with the 2025 OpenAI Responses API.
 */
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

    // ✅ Correct 2025 structured text output
    text: {
      format: {
        type: "json_schema",
        name: jsonSchema.name,   // REQUIRED
        schema: jsonSchema.schema, // REQUIRED (not json_schema)
      },
    },
  });

  /* -------------------------------------------------
     Preferred: SDK-provided parsed output
  -------------------------------------------------- */
  if (
    response &&
    typeof response.output_parsed === "object" &&
    response.output_parsed !== null
  ) {
    return response.output_parsed;
  }

  /* -------------------------------------------------
     Defensive fallbacks (SDK variance)
  -------------------------------------------------- */

  if (typeof response?.output_text === "string") {
    const parsed = tryJsonParse(response.output_text);
    if (parsed) return parsed;
  }

  const output = response?.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const candidates = [
        item?.text,
        item?.content,
        item?.value,
      ];

      for (const c of candidates) {
        const parsed = tryJsonParse(c);
        if (parsed) return parsed;
      }

      if (Array.isArray(item?.content)) {
        for (const part of item.content) {
          const parsed = tryJsonParse(
            part?.text || part?.content || part?.value
          );
          if (parsed) return parsed;
        }
      }
    }
  }

  const err = new Error("OpenAI returned unparseable JSON output");
  err.detail = response;
  throw err;
}
