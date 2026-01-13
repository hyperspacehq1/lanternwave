import { JsonSchema2026, assertSchemaName } from "@/lib/ai/schemaTypes";

const itemsSchema: JsonSchema2026 = {
  name: "items",
  strict: true,

  description:
    "Items, artifacts, weapons, or objects that appear within an RPG campaign.",

  schema: {
    type: "object",
    additionalProperties: false,

    properties: {
      name: {
        type: "string",
        description: "Name of the item or artifact. Less than 20 words.",
      },

      item_type: {
        type: "string",
        description:
          "Category or type of the item, such as weapon, artifact, tool, or relic.",
      },

      description: {
        type: "string",
        description:
          "Short description of the item, its purpose, or its appearance. Under 100 words.",
      },

      notes: {
        type: "string",
        description:
          "Additional details not covered elsewhere, such as history, quirks, or usage notes.",
      },

      properties: {
        type: "string",
        description:
          "Special traits, magical effects, or unique behaviors of the item.",
      },
    },

    required: ["name", "item_type", "description", "notes", "properties"],
  },
};

assertSchemaName(itemsSchema);
export default itemsSchema;
