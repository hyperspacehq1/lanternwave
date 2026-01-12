const sessionsSchema = {
  name: "sessions",
  strict: true,	

  description:
    "Represents an individual chapter or chapter-like segment within a larger RPG campaign. Sessions define the narrative structure and progression of the adventure.",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: {
        type: "string",
        description:
          "The title of the chapter or session. This functions like a chapter name in a book and represents a distinct portion of the overall campaign narrative. Less than 20 words.",
      },

      description: {
        type: "string",
        description:
          "A concise summary of the session’s story events, themes, or objectives. This should describe what happens during this chapter in 100 words or fewer.",
      },

      notes: {
        type: "string",
        description:
          "Additional notes, context, or guidance for running the session. This may include expected outcomes, optional story beats, pacing notes, or special considerations not covered in the main description. Maximum 400 words.",
      },
    },
    required: ["name", "description", "notes"],
  },
};

export default sessionsSchema;
