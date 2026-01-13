// lib/ai/schemaTypes.ts

export type JsonSchema2026 = {
  name: string;                 // REQUIRED by OpenAI
  strict: true;
  description?: string;
  schema: {
    type: "object";
    additionalProperties: boolean;
    properties: Record<string, unknown>;
    required: string[];
  };
};

/**
 * One-line runtime assertion.
 * If this throws, the error message tells you EXACTLY which schema is broken.
 */
export const assertSchemaName = (schema: JsonSchema2026) =>
  schema.name || (() => { throw new Error("❌ Schema missing required `name`"); })();
