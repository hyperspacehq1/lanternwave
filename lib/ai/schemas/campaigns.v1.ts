const campaignsSchema = {
  name: "campaigns",
  description:
    "Top-level campaign metadata extracted from an RPG module. Represents a complete Adventure Codex entry.",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: {
        type: "string",
        description:
          "The official title of the RPG module or adventure. This is usually the name shown on the cover or first page of the document. Keep under 20 words.",
      },

      description: {
        type: "string",
        description:
          "A concise summary of the overall story or narrative of the RPG module. Should describe the premise, stakes, and general theme in under 200 words.",
      },

      world_setting: {
        type: "string",
        description:
          "A short description of the world, region, or setting in which the adventure takes place. Usually includes geography, tone, or era. Less than 100 words.",
      },

      campaign_date: {
        type: "string",
        description:
          "The in-world or real-world time period when the adventure takes place. May be a specific date (MM/DD/YYYY), a year, or an approximate era if not explicitly stated.",
      },

      campaign_package: {
        type: "string",
        description:
          "The generated name of the Adventure Codex. Typically a combination of the RPG system and the campaign name.",
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
    "The tabletop roleplaying system used for this campaign. Must match one of the supported RPG systems.",
}

      is_template: {
        type: "boolean",
        description:
          "Indicates whether this campaign is a reusable Adventure Codex template. This value should always be true for imported modules.",
      },

      template_campaign_id: {
        type: "string",
        description:
          "A unique identifier assigned to this Adventure Codex. Used to link all extracted data back to the originating campaign template.",
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
