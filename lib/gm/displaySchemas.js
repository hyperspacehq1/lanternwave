export const DISPLAY_SCHEMAS = {
  /* =========================
     EVENTS
  ========================= */
  events: [
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
  ],

  /* =========================
     ENCOUNTERS
  ========================= */
  encounters: [
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    { key: "development", label: "Development" },
  ],

  /* =========================
     LOCATIONS
  ========================= */
  locations: [
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    { key: "notes", label: "Notes" },

    // renamed conceptually for GM readability
    {
      key: "detail_echoes",
      label: "Detail Echoes",
      type: "text",
      font: "echo",
    },
    {
      key: "sensory",
      label: "Sensory Echoes",
      type: "text",
      font: "echo",
    },
  ],

  /* =========================
     NPCs
  ========================= */
  npcs: [
    { key: "name", label: "Name" },
    { key: "npcType", label: "NPC Type" },
    { key: "description", label: "Description" },
    { key: "goals", label: "Goals" },
    { key: "secrets", label: "Secrets", collapsed: true },
  ],

  /* =========================
     ITEMS
  ========================= */
  items: [
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    { key: "notes", label: "Notes" },
    { key: "properties", label: "Properties" },
  ],
};
