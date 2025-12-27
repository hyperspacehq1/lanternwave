const npcsSchema = {
  name: "npcs",
  description: "Non-player characters that appear within the campaign world",
  schema: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
          description: "Full name of the non-player character",
        },
        role: {
          type: "string",
          description: "Narrative or functional role of the NPC in the story",
        },
        description: {
          type: "string",
          description: "Physical appearance, personality, and notable traits",
        },
        affiliation: {
          type: "string",
          description: "Faction, organization, or group the NPC belongs to",
        },
        motivation: {
          type: "string",
          description: "Primary goals or motivations of the character",
        }
      },
      required: [
        "name",
        "role",
        "description",
        "affiliation",
        "motivation"
      ]
    }
  }
};

export default npcsSchema;
