const encountersSchema = {
  name: "encounters",
  description: "Discrete encounters within a campaign module",
  schema: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
          description: "Name of the encounter",
        },
        description: {
          type: "string",
          description: "Narrative description of the encounter",
        },
        location: {
          type: "string",
          description: "Where the encounter takes place",
        },
        related_events: {
          type: "array",
          items: { type: "string" },
          description: "Associated story events",
        },
      },
      required: ["name", "description", "location", "related_events"],
    },
  },
};

export default encountersSchema;
