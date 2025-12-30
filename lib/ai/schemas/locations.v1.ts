const locationsSchema = {
  name: "locations",
  description:
    "Represents a physical or fictional place within an RPG campaign. Locations may be real-world, fictional, or abstract settings used during the story.",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: {
        type: "string",
        description:
          "The name of the location. This may be a specific place, landmark, building, or general area. Less than 20 words.",
      },

      world: {
        type: "string",
        description:
          "The broader region, realm, or world in which this location exists. Less than 20 words.",
      },

      description: {
        type: "string",
        description:
          "A short narrative description of the location, including atmosphere, purpose, or significance. Maximum 200 words.",
      },

      street: {
        type: "string",
        description:
          "Street name or address if the location corresponds to a real-world or structured address. Optional.",
      },

      city: {
        type: "string",
        description:
          "City or municipality where the location is situated, if applicable.",
      },

      state: {
        type: "string",
        description:
          "State, province, or region for the location, if applicable.",
      },

      zip: {
        type: "string",
        description:
          "Postal or ZIP code associated with the location, if applicable.",
      },

      country: {
        type: "string",
        description:
          "Country in which the location exists, if applicable.",
      },
    },
    required: ["name", "world", "description"],
  },
};

export default locationsSchema;
