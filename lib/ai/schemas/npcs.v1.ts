const npcsSchema = {
  name: "npcs",
  description:
    "Represents a non-player character (NPC) that appears within an RPG campaign. NPCs may be allies, adversaries, or neutral figures who influence the story.",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: {
        type: "string",
        description:
          "The name or identifying title of the NPC. This may be a proper name or a descriptive label if no formal name is provided. Less than 20 words.",
      },

      npc_type: {
        type: "string",
        enum: ["Ally", "Enemy", "Neutral", "Merchant", "Authority", "Mystic"],
        description:
          "The general role or alignment of the NPC within the story. Must be one of the predefined values.",
      },

      description: {
        type: "string",
        description:
          "A concise description of the NPC, including appearance, demeanor, or narrative role. Maximum 200 words.",
      },

      goals: {
        type: "string",
        description:
          "The motivations or objectives driving the NPC’s actions. Less than 100 words.",
      },

      faction_alignment: {
        type: "string",
        description:
          "Any organization, faction, or group the NPC is affiliated with. Leave empty if unaffiliated. Less than 100 words.",
      },

      secrets: {
        type: "string",
        description:
          "Hidden information or secrets known by the NPC that may affect the story. Less than 100 words.",
      },

      notes: {
        type: "string",
        description:
          "Additional background or contextual details not covered elsewhere. Maximum 400 words.",
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

export default npcsSchema;
