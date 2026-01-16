export const locationColorDetailSchema = {
  name: "location_color_detail",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      bullets: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: { type: "string" }
      }
    },
    required: ["bullets"]
  }
};
