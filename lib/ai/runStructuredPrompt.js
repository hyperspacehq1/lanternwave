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
 * Uses the 2025 OpenAI Responses API (`text.format`).
 *
 * Returns the parsed object or throws a descriptive error.
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

    // 2025 Responses API — structured text output
    text: {
      format: {
        type: "json_schema",
        json_schema: jsonSchema,
      },
    },
  });

  /* -------------------------------------------------
     Preferred path: SDK-provided parsed output
  -------------------------------------------------- */
  if (
    response &&
    typeof response.output_parsed === "object" &&
    response.output_parsed !== null
  ) {
    return response.output_parsed;
  }

  /* -------------------------------------------------
     Fallbacks (defensive for SDK variance)
  -------------------------------------------------- */

  // Some SDK versions expose output_text
  if (typeof response?.output_text === "string") {
    const parsed = tryJsonParse(response.output_text);
    if (parsed) return parsed;
  }

  // Inspect output array for JSON-like text
  const output = response?.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      // Check common fields
      const candidates = [
        item?.text,
        item?.content,
        item?.value,
      ];

      for (const c of candidates) {
        const parsed = tryJsonParse(c);
        if (parsed) return parsed;
      }

      // Deep scan content arrays
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

  /* -------------------------------------------------
     Failure
  -------------------------------------------------- */
  const err = new Error("OpenAI returned unparseable JSON output");
  err.detail = response;
  throw err;
}
