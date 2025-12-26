const eventsSchema = {
  name: "events",
  schema: {
    type: "array",
    description:
      "Significant narrative events that occur or may occur during the campaign. Do not include combat encounters unless they are explicitly framed as story events. Events may occur with or without the players present.",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description:
            "The name or short label of the event as described in the module.",
          maxLength: 200,
        },
        description: {
          type: "string",
          description:
            "Narrative description of the event, using only information present in the module text.",
          maxLength: 10000,
        },
        timing: {
          type: "string",
          description:
            "When or under what conditions the event occurs, if specified (e.g. after a clue is discovered, at a certain date, etc.).",
          maxLength: 200,
        },
      },
    },
  },
};

export default eventsSchema;
