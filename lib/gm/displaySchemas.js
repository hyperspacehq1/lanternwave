export const DISPLAY_SCHEMAS = {
  items: [
    { key: "name", label: "Name" },
    { key: "itemType", label: "Type" },
    { key: "description", label: "Description" },
    { key: "notes", label: "Notes" },
    { key: "properties", label: "Properties", type: "json" },
  ],

  npcs: [
    { key: "name", label: "Name" },
    { key: "npcType", label: "Type" },
    { key: "description", label: "Description" },
    { key: "goals", label: "Goals" },
    { key: "secrets", label: "Secrets", collapsed: true },
  ],

  locations: [
    { key: "name", label: "Name" },
    { key: "world", label: "World" },
    { key: "description", label: "Description" },
    { key: "sensory", label: "Sensory", type: "json" },
  ],
};
