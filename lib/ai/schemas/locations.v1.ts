const locationsSchema = {
  name: "locations",

  description:
    "Represents a physical or fictional place within an RPG campaign. Locations may be real-world, fictional, or abstract settings.",

  schema: {
    type: "object",
    additionalProperties: false,

    properties: {
      name: {
        type: "string",
        description:
          "The name of the location. May be a dungeon, building, landmark, or general area.",
      },

      world: {
        type: ["string", "null"],
        description:
          "The broader world, realm, plane, or setting where this location exists.",
      },

      description: {
        type: ["string", "null"],
        description:
          "Short narrative description of the location, including atmosphere or significance.",
      },

      address_street: {
        type: ["string", "null"],
        description:
          "Street address if the location has a real-world or structured address. Usually null.",
      },

      address_city: {
        type: ["string", "null"],
        description:
          "City or settlement name if applicable (e.g. Arkham).",
      },

      address_state: {
        type: ["string", "null"],
        description:
          "State, province, or region if applicable (e.g. Massachusetts).",
      },

      address_zip: {
        type: ["string", "null"],
        description:
          "Postal or ZIP code if applicable. Rarely present.",
      },

      address_country: {
        type: ["string", "null"],
        description:
          "Country name if applicable (e.g. United States).",
      },
    },

    /*
      OPENAI STRUCTURED OUTPUT RULE:
      Every property must be listed in `required`,
      even if the value is allowed to be null.
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
