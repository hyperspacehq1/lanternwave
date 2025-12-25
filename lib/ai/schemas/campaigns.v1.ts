{
  "name": "campaign",
  "schema": {
    "type": "object",
    "additionalProperties": false,
    "required": [
      "name",
      "description",
      "world_setting",
      "campaign_date",
      "rpg_game"
    ],
    "properties": {
      "name": {
        "type": "string",
        "description": "Name of the RPG module"
      },
      "description": {
        "type": "string",
        "maxLength": 600,
        "description": "Short summary under 100 words"
      },
      "world_setting": {
        "type": "string",
        "description": "Region or setting where the campaign takes place"
      },
      "campaign_date": {
        "type": "string",
        "description": "Approximate year or date range"
      },
      "rpg_game": {
        "type": "string",
        "description": "RPG system (must match existing campaign form options)"
      }
    }
  }
}
