{
  "name": "items",
  "schema": {
    "type": "array",
    "items": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "item_type", "description"],
      "properties": {
        "name": {
          "type": "string"
        },
        "item_type": {
          "type": "string",
          "description": "Weapon, artifact, document, tool, etc."
        },
        "description": {
          "type": "string",
          "maxLength": 600
        },
        "notes": {
          "type": "string",
          "maxLength": 2400
        }
      }
    }
  }
}
