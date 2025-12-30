export const locationSensorySchema = {
  name: "location_sensory",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      hear: { type: "string" },
      smell: { type: "string" },
    },
    required: ["hear", "smell"],
  },
};
