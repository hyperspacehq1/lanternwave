const itemsSchema = {
  name: "items",
  description:
    "Represents a physical or magical object that exists within an RPG campaign. Items may include weapons, artifacts, tools, or other notable objects.",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: {
        type: "string",
        description:
          "The name of the item or artifact. This may be a proper name or a descriptive title. Less than 20 words.",
      },

      item_type: {
        type: "string",
        description:
          "A short description of the category or type of item, such as weapon, artifact, tool, or relic. Less than 20 words.",
      },

      description: {
        type: "string",
        description:
          "A brief summary describing the item’s appearance, purpose, or lore. Maximum 100 words.",
      },

      notes: {
        type: "string",
        description:
          "Additional contextual or narrative information about the item that does not fit into the main description. Maximum 400 words.",
      },

      properties: {
        type: "string",
        description:
          "Special traits, magical effects, curses, or unique characteristics associated with the item.",
      },
    },
    required: ["name", "item_type", "description", "notes", "properties"],
  },
};

export default itemsSchema;
