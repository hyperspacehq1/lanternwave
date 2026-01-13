import { JsonSchema2026, assertSchemaName } from "@/lib/ai/schemaTypes";

const encountersSchema: JsonSchema2026 = {
  name: "encounters",
  strict: true,

  description:
    "Represents a structured encounter within an RPG campaign. Encounters define moments where characters interact with locations, NPCs, events, or challenges.",

  schema: {
    type: "object",
    additionalProperties: false,

    properties: {
      name: {
        type: "string",
        description:
          "A short descriptive title for the encounter. Less than 20 words.",
      },

      description: {
        type: "string",
        description:
          "A concise summary of what happens during the encounter. Maximum 100 words.",
      },

      notes: {
        type: "string",
        description:
          "Additional details or guidance related to the encounter. Maximum 400 words.",
      },
    },

    required: ["name", "description", "notes"],
  },
};

assertSchemaName(encountersSchema);
export default encountersSchema;
