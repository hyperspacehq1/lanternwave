const sessionsSchema = {
  name: "sessions",
  schema: {
    type: "array",
    description:
      "Major chapters, acts, or play sessions defined by the module. Only include sections that are clearly delineated as playable segments.",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description:
            "The session, chapter, or act title exactly as named in the module.",
          maxLength: 200,
        },
        summary: {
          type: "string",
          description:
            "A concise summary of what happens during this session, derived directly from the module text.",
          maxLength: 10000,
        },
        session_order: {
          type: "number",
          description:
            "The intended chronological order of this session within the campaign, if explicitly indicated.",
        },
      },
    },
  },
};

export default sessionsSchema;
