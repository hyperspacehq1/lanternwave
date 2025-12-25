{
  "name": "npcs",
  "schema": {
    "type": "array",
    "items": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "npc_type", "description"],
      "properties": {
        "name": {
          "type": "string",
          "description": "NPC name or descriptor"
        },
        "npc_type": {
          "type": "string",
          "enum": [
            "Ally",
            "Enemy",
            "Neutral",
            "Merchant",
            "Authority",
            "Mystic"
          ]
        },
        "description": {
          "type": "string",
          "maxLength": 600
        },
        "goals": {
          "type": "string",
          "description": "NPC motivations or objectives"
        },
        "faction_alignment": {
          "type": "string",
          "description": "Group or faction affiliation"
        },
        "secrets": {
          "type": "string",
          "description": "Hidden knowledge or secrets"
        },
        "notes": {
          "type": "string",
          "maxLength": 2400
        }
      }
    }
  }
}
