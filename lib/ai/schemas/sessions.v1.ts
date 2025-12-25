{
  "name": "sessions",
  "schema": {
    "type": "array",
    "items": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "description"],
      "properties": {
        "name": {
          "type": "string",
          "description": "Chapter or session name"
        },
        "description": {
          "type": "string",
          "maxLength": 600,
          "description": "Summary under 100 words"
        },
        "notes": {
          "type": "string",
          "maxLength": 2400,
          "description": "Additional guidance, outcomes, or GM notes"
        }
      }
    }
  }
}
