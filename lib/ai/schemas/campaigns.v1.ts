const campaignsSchema = {
  name: "campaigns",
  description: "Top-level campaign metadata extracted from an RPG module",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: {
        type: "string",
        description: "The official title of the campaign or module",
      },
      description: {
        type: "string",
        description: "Summary of the campaign or adventure",
      },
      setting: {
        type: "string",
        description: "Primary setting or world where the campaign takes place",
      },
      rpg_game: {
        type: "string",
        description: "The tabletop roleplaying system used",
      },
    },
    required: [
      "name",
      "description",
      "setting",
      "rpg_game"
    ],
  },
};

export default campaignsSchema;
