{
  "name": "encounters",
  "schema": {
    "type": "array",
    "items": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "description"],
      "properties": {
        "name": {
          "type": "string",
          "description": "Short encounter title"
        },
        "description": {
          "type": "string",
          "maxLength": 600
        },
        "notes": {
          "type": "string",
          "maxLength": 2400
        },
        "related_npcs": {
          "type": "array",
          "items": { "type": "string" },
          "description": "NPC names involved"
        },
        "related_items": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Item names involved"
        },
        "related_locations": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Location names involved"
        },
        "related_events": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Event names associated with this encounter"
        }
      }
    }
  }
}
