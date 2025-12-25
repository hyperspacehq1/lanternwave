{
  "name": "locations",
  "schema": {
    "type": "array",
    "items": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "description"],
      "properties": {
        "name": {
          "type": "string"
        },
        "world": {
          "type": "string",
          "description": "Region or broader location"
        },
        "description": {
          "type": "string",
          "maxLength": 1200
        },
        "street": { "type": "string" },
        "city": { "type": "string" },
        "state": { "type": "string" },
        "zip": { "type": "string" },
        "country": { "type": "string" }
      }
    }
  }
}
