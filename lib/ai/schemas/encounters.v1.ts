const encountersSchema = {
  name: "encounters",
  description:
    "Represents a structured encounter within an RPG campaign. Encounters define moments where characters interact with locations, NPCs, events, or challenges.",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: {
        type: "string",
        description:
          "A short descriptive title for the encounter. This should summarize the situation or moment the players experience. Less than 20 words.",
      },

      description: {
        type: "string",
        description:
          "A concise summary of what happens during the encounter, including context, stakes, or narrative purpose. Maximum 100 words.",
      },

      notes: {
        type: "string",
        description:
          "Additional details or guidance related to the encounter. May include optional paths, outcomes, pacing notes, or GM-only information. Maximum 400 words.",
      },
    },
    required: ["name", "description", "notes"],
  },
};

export default encountersSchema;
