const itemsSchema = {
  name: "items",
  description: "Physical or magical items that appear in the campaign",
  schema: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
          description: "Name of the item",
        },
        description: {
          type: "string",
          description: "Description of the item and its appearance",
        },
        rarity: {
          type: "string",
          description: "Rarity classification of the item",
        },
        effects: {
          type: "string",
          description: "Mechanical or narrative effects of the item",
        },
        location_found: {
          type: "string",
          description: "Where the item can be found or obtained",
        }
      },
      required: [
        "name",
        "description",
        "rarity",
        "effects",
        "location_found"
      ]
    }
  }
};

export default itemsSchema;
