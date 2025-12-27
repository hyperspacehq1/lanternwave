const locationsSchema = {
  name: "locations",
  description: "Physical locations where events occur within the campaign",
  schema: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
          description: "The proper name of the location as written in the source material.",
          maxLength: 200,
        },
        description: {
          type: "string",
          description: "Detailed narrative description of the location.",
          maxLength: 10000,
        },
        environment: {
          type: "string",
          description:
            "The general environment or biome of the location (e.g. urban, wilderness, underground).",
          maxLength: 500,
        },
      },
      required: ["name", "description", "environment"],
    },
  },
};

export default locationsSchema;
