const eventsSchema = {
  name: "events",
  description: "Discrete narrative or gameplay events that occur within a campaign",
  schema: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: {
          type: "string",
          description: "Name of the event",
        },
        description: {
          type: "string",
          description: "Narrative description of what happens during the event",
        },
        location: {
          type: "string",
          description: "Where the event takes place",
        },
        involved_npcs: {
          type: "array",
          items: { type: "string" },
          description: "NPCs involved in the event",
        },
        consequences: {
          type: "string",
          description: "Outcome or consequences of the event",
        }
      },
      required: [
        "title",
        "description",
        "location",
        "involved_npcs",
        "consequences"
      ]
    }
  }
};

export default eventsSchema;
