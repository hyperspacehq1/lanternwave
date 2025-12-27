const sessionsSchema = {
  name: "sessions",
  description: "Individual play sessions that occur within a campaign",
  schema: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: {
          type: "string",
          description: "Title or name of the session",
        },
        summary: {
          type: "string",
          description: "Summary of what occurred during the session",
        },
        location: {
          type: "string",
          description: "Primary location where the session takes place",
        },
        involved_characters: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Names of characters involved in the session",
        },
        key_events: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Major events or turning points during the session",
        }
      },
      required: [
        "title",
        "summary",
        "location",
        "involved_characters",
        "key_events"
      ]
    }
  }
};

export default sessionsSchema;
