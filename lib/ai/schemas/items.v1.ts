const itemsSchema = {
  name: "items",
  schema: {
    type: "array",
    description:
      "Notable objects, artifacts, or equipment that are important to the story or investigation. Exclude mundane gear unless highlighted by the module.",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description:
            "The item's name exactly as written in the module.",
          maxLength: 200,
        },
        description: {
          type: "string",
          description:
            "Narrative description of the item, including appearance and known properties from the module.",
          maxLength: 10000,
        },
        significance: {
          type: "string",
          description:
            "Why the item matters to the story (e.g. clue, weapon, ritual focus), if specified.",
          maxLength: 500,
        },
      },
    },
  },
};

export default itemsSchema;
