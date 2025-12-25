const campaignsSchema = {
  name: "campaigns",
  schema: {
    type: "object",
    additionalProperties: false,
    description:
      "Top-level campaign metadata extracted from the module. This represents the overall adventure or book, not an individual playthrough.",
    required: ["name"],
    properties: {
      name: {
        type: "string",
        description:
          "The official title of the campaign or module as written in the PDF.",
        maxLength: 200,
      },
      description: {
        type: "string",
        description:
          "High-level narrative summary of the campaign taken directly from the module introduction or overview section.",
        maxLength: 10000,
      },
      world_setting: {
        type: "string",
        description:
          "The primary setting, location, or world in which the campaign takes place (e.g. region, city, planet, era).",
        maxLength: 500,
      },
      campaign_date: {
        type: "string",
        description:
          "In-world time period or historical era if explicitly stated (not the publication date).",
      },
      rpg_game: {
        type: "string",
        description:
          "The tabletop roleplaying game system this module is written for.",
        maxLength: 120,
      },
    },
  },
};

export default campaignsSchema;
