import { JsonSchema2026, assertSchemaName } from "@/lib/ai/schemaTypes";

const sessionsSchema: JsonSchema2026 = {
  name: "sessions",
  strict: true,

  description:
    "Represents an individual chapter or session within a larger RPG campaign.",

  schema: {
    type: "object",
    additionalProperties: false,

    properties: {
      name: {
        type: "string",
        description:
          "Title of the chapter or session. Less than 20 words.",
      },

      description: {
        type: "string",
        description:
          "Summary of the session’s story events. Under 100 words.",
      },

      notes: {
        type: "string",
        description:
          "Additional guidance or context. Maximum 400 words.",
      },
    },

    required: ["name", "description", "notes"],
  },
};

assertSchemaName(sessionsSchema);
export default sessionsSchema;
