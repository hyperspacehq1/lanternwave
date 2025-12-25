const encountersSchema = {
  name: "encounters",
  schema: {
    type: "array",
    description:
      "Discrete scenes or situations where player characters confront NPCs, dangers, or major challenges. Encounters may be combat, social, or investigative.",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description:
            "The encounter name or short label as presented in the module.",
          maxLength: 200,
        },
        description: {
          type: "string",
          description:
            "Description of what happens during the encounter, based strictly on the module text.",
          maxLength: 10000,
        },
        related_npcs: {
          type: "array",
          description:
            "Names of NPCs that participate in or are central to this encounter. Use exact names as defined in the NPC list.",
          items: { type: "string", maxLength: 200 },
        },
        related_items: {
          type: "array",
          description:
            "Names of items that are used, discovered, or relevant during this encounter.",
          items: { type: "string", maxLength: 200 },
        },
        related_locations: {
          type: "array",
          description:
            "Names of locations where this encounter takes place.",
          items: { type: "string", maxLength: 200 },
        },
        related_events: {
          type: "array",
          description:
            "Names of larger narrative events that this encounter contributes to or triggers.",
          items: { type: "string", maxLength: 200 },
        },
      },
    },
  },
};

export default encountersSchema;
