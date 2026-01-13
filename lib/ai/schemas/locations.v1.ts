import { JsonSchema2026, assertSchemaName } from "@/lib/ai/schemaTypes";

const locationsSchema: JsonSchema2026 = {
  name: "locations",
  strict: true,

  description:
    "Represents a physical or fictional place within an RPG campaign.",

  schema: {
    type: "object",
    additionalProperties: false,

    properties: {
      name: {
        type: "string",
        description: "Name of the location.",
      },

      world: {
        type: ["string", "null"],
        description: "World, realm, or plane.",
      },

      description: {
        type: ["string", "null"],
        description: "Narrative description of the location.",
      },

      address_street: {
        type: ["string", "null"],
      },

      address_city: {
        type: ["string", "null"],
      },

      address_state: {
        type: ["string", "null"],
      },

      address_zip: {
        type: ["string", "null"],
      },

      address_country: {
        type: ["string", "null"],
      },
    },

    required: [
      "name",
      "world",
      "description",
      "address_street",
      "address_city",
      "address_state",
      "address_zip",
      "address_country",
    ],
  },
};

assertSchemaName(locationsSchema);
export default locationsSchema;
