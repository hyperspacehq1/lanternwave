const locationsSchema = {
  name: "locations",

  description:
    "Represents a physical or fictional place within an RPG campaign.",

  schema: {
    type: "object",
    additionalProperties: false,

    properties: {
      name: {
        type: "string",
        description: "Name of the location.",
      },

      world: {
        type: ["string", "null"],
        description:
          "World, realm, or plane where the location exists.",
      },

      description: {
        type: ["string", "null"],
        description:
          "Narrative description of the location.",
      },

      address_street: {
        type: ["string", "null"],
        description:
          "Street address if applicable (usually null).",
      },

      address_city: {
        type: ["string", "null"],
        description:
          "City or settlement name if applicable.",
      },

      address_state: {
        type: ["string", "null"],
        description:
          "State or region if applicable.",
      },

      address_zip: {
        type: ["string", "null"],
        description:
          "Postal or ZIP code if applicable.",
      },

      address_country: {
        type: ["string", "null"],
        description:
          "Country if applicable.",
      },
    },

    /*
      OPENAI RULE:
      Every property must be listed in `required`
      even if its value is allowed to be null.
    */
    required: [
      "name",
      "world",
      "description",
      "address_street",
      "address_city",
      "address_state",
      "address_zip",
      "address_country",
    ],
  },
};

export default locationsSchema;
