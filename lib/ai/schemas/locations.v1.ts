const locationsSchema = {
  name: "locations",
  schema: {
    type: "array",
    description:
      "Distinct named places where scenes, investigations, or encounters occur. Do not include vague or unnamed areas.",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description:
            "The proper name of the location as written in the module.",
          maxLength: 200,
        },
        description: {
          type: "string",
          description:
            "Sensory and narrative description of the location taken from the module text.",
          maxLength: 10000,
        },
        environment: {
          type: "string",
          description:
            "The general environment or category of the location (e.g. urban, wilderness, underground, alien).",
          maxLength: 500,
        },
      },
    },
  },
};

export default locationsSchema;
