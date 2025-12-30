const campaignsSchema = {
  name: "campaigns",
  description: "Top-level campaign metadata extracted from an RPG module.",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: {
        type: "string",
        description:
          "Official title of the RPG module or campaign. Less than 20 words.",
      },

      description: {
        type: "string",
        description:
          "Short summary of the campaign story and themes. Under 200 words.",
      },

      world_setting: {
        type: "string",
        description:
          "The world, region, or setting in which the campaign takes place.",
      },

      campaign_date: {
        type: "string",
        description:
          "Estimated in-world date or era for the campaign. Can be a year or full date.",
      },

      campaign_package: {
        type: "string",
        description:
          "Name of the Adventure Codex this campaign belongs to.",
      },

      rpg_game: {
        type: "string",
        enum: [
          "ALIEN: The Roleplaying Game",
          "Avatar Legends: The Roleplaying Game",
          "Black Powder & Brimstone",
          "Blade Runner: The Roleplaying Game",
          "Call of Cthulhu",
          "Coriolis: The Great Dark",
          "Cyberpunk TTRPG",
          "Cypher System / Daggerheart",
          "Delta Green",
          "Dragonbane",
          "Dungeon Crawl Classics",
          "Dungeons & Dragons 5th Edition",
          "Fabula Ultima",
          "Forbidden Lands",
          "Into the Odd",
          "Invincible: The Roleplaying Game",
          "Land of Eem",
          "Marvel Multiverse RPG",
          "Mörk Borg",
          "Mutant: Year Zero",
          "Mythic Bastionland",
          "Nimble 5e",
          "Pathfinder 2nd Edition",
          "Pirate Borg",
          "Ruins of Symbaroum",
          "Savage Worlds",
          "Shadowrun (6th/updated editions)",
          "Starfinder 2nd Edition",
          "StartPlaying",
          "Symbaroum",
          "Tales from the Loop",
          "Tales of the Valiant",
          "The Electric State Roleplaying Game",
          "The One Ring Roleplaying Game",
          "Vaesen",
          "Vampire: The Masquerade 5th Edition"
        ],
        description:
          "The tabletop RPG system used for this campaign.",
      },

      is_template: {
        type: "boolean",
        description:
          "Indicates whether this campaign is a reusable Adventure Codex template.",
      },

      template_campaign_id: {
        type: "string",
        description:
          "Unique ID linking this campaign to its originating Adventure Codex.",
      },
    },
    required: [
      "name",
      "description",
      "world_setting",
      "campaign_date",
      "campaign_package",
      "rpg_game",
      "is_template",
      "template_campaign_id"
    ],
  },
};

export default campaignsSchema;
