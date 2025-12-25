const npcsSchema = {
  name: "npcs",
  schema: {
    type: "array",
    description:
      "Named non-player characters that appear in the module. Only include characters that are explicitly named and described.",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description:
            "The NPC's full name or most commonly used name in the module.",
          maxLength: 200,
        },
        role: {
          type: "string",
          description:
            "The NPC's narrative or functional role (e.g. antagonist, ally, informant, cultist).",
          maxLength: 200,
        },
        description: {
          type: "string",
          description:
            "Physical appearance, personality, and background details drawn directly from the module text.",
          maxLength: 10000,
        },
        motivations: {
          type: "string",
          description:
            "The NPC's goals, desires, or driving motivations if explicitly stated.",
          maxLength: 2000,
        },
      },
    },
  },
};

export default npcsSchema;
