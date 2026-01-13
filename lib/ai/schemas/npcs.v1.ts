import { JsonSchema2026, assertSchemaName } from "@/lib/ai/schemaTypes";

const npcsSchema: JsonSchema2026 = {
  name: "npcs",
  strict: true,

  description:
    "Represents a non-player character (NPC) that appears within an RPG campaign. NPCs may be allies, adversaries, or neutral figures who influence the story.",

  schema: {
    type: "object",
    additionalProperties: false,

    properties: {
      name: {
        type: "string",
        description:
          "The name or identifying title of the NPC. Less than 20 words.",
      },

      npc_type: {
        type: "string",
        enum: ["Ally", "Enemy", "Neutral", "Merchant", "Authority", "Mystic"],
        description:
          "The general role or alignment of the NPC within the story.",
      },

      description: {
        type: "string",
        description:
          "Concise description of the NPC. Maximum 200 words.",
      },

      goals: {
        type: "string",
        description:
          "Motivations or objectives driving the NPC. Less than 100 words.",
      },

      faction_alignment: {
        type: "string",
        description:
          "Organization or faction affiliation. Less than 100 words.",
      },

      secrets: {
        type: "string",
        description:
          "Hidden information known by the NPC. Less than 100 words.",
      },

      notes: {
        type: "string",
        description:
          "Additional background details. Maximum 400 words.",
      },
    },

    required: [
      "name",
      "npc_type",
      "description",
      "goals",
      "faction_alignment",
      "secrets",
      "notes",
    ],
  },
};

assertSchemaName(npcsSchema);
export default npcsSchema;
