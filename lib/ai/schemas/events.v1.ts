{
  "name": "events",
  "schema": {
    "type": "array",
    "items": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "description",
        "event_type",
        "priority"
      ],
      "properties": {
        "name": {
          "type": "string",
          "description": "Event name"
        },
        "description": {
          "type": "string",
          "maxLength": 1800,
          "description": "Event summary under 300 words"
        },
        "event_type": {
          "type": "string",
          "enum": [
            "Combat",
            "Story",
            "Exploration",
            "Social",
            "Downtime"
          ]
        },
        "priority": {
          "type": "integer",
          "minimum": 1,
          "maximum": 1000,
          "description": "Chronological order of events"
        }
      }
    }
  }
}
