const eventsSchema = {
  name: "events",
  description:
    "Represents a discrete event that occurs within an RPG campaign. Events may happen with or without player involvement and define the unfolding of the narrative.",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: {
        type: "string",
        description:
          "A short title describing the event. This should clearly identify the situation or occurrence. Less than 20 words.",
      },

      description: {
        type: "string",
        description:
          "A concise summary of what happens during the event. This may include story beats, consequences, or narrative developments. Maximum 300 words.",
      },

      event_type: {
        type: "string",
        enum: ["Combat", "Story", "Exploration", "Social", "Downtime"],
        description:
          "The category that best describes the nature of the event. Must be one of the predefined values.",
      },

      priority: {
        type: "number",
        description:
          "A numeric value representing the order in which this event occurs within the overall campaign timeline. Lower numbers occur earlier; higher numbers occur later. Each event should have a unique value.",
      },
    },
    required: ["name", "description", "event_type", "priority"],
  },
};

export default eventsSchema;
