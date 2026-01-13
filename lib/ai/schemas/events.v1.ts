import { JsonSchema2026, assertSchemaName } from "@/lib/ai/schemaTypes";

const eventsSchema: JsonSchema2026 = {
  name: "events",
  strict: true,

  description:
    "Represents a discrete event that occurs within an RPG campaign. Events may happen with or without player involvement and define the unfolding of the narrative.",

  schema: {
    type: "object",
    additionalProperties: false,

    properties: {
      name: {
        type: "string",
        description:
          "A short title describing the event. Less than 20 words.",
      },

      description: {
        type: "string",
        description:
          "A concise summary of what happens during the event. Maximum 300 words.",
      },

      event_type: {
        type: "string",
        enum: ["Combat", "Story", "Exploration", "Social", "Downtime"],
        description:
          "The category that best describes the nature of the event.",
      },

      priority: {
        type: "number",
        description:
          "Order in which the event occurs within the campaign timeline.",
      },
    },

    required: ["name", "description", "event_type", "priority"],
  },
};

assertSchemaName(eventsSchema);
export default eventsSchema;
