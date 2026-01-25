// /lib/cm/labels.js

/**
 * Returns the display label for a record in the Campaign Manager list.
 * Covers all tabs EXCEPT players.
 * Players intentionally handled inline due to custom name logic.
 */

export function getRecordLabel(type, record) {
  if (!record) return "";

  // ----------------------------
  // NEW (unsaved) records
  // ----------------------------
  if (record._isNew) {
    switch (type) {
      case "campaigns":
        return "New Campaign";
      case "sessions":
        return "New Session";
      case "events":
        return "New Event";
      case "encounters":
        return "New Encounter";
      case "locations":
        return "New Location";
      case "npcs":
        return "New NPC";
      case "items":
        return "New Item";
      default:
        return "New Record";
    }
  }

  // ----------------------------
  // EXISTING records
  // ----------------------------
  switch (type) {
    case "campaigns":
    case "sessions":
    case "events":
    case "encounters":
    case "locations":
    case "npcs":
    case "items":
      return record.name || "(unnamed)";

    default:
      return "(unnamed)";
  }
}

// Player labels are special (no `name` field)
export function getPlayerLabel(player) {
  if (!player) return "";

  // New, unsaved player
  if (player._isNew) {
    return "New Player Character";
  }

  // Existing player
  return (
    player.character_name ||
    `${player.first_name || ""} ${player.last_name || ""}`.trim() ||
    "(unnamed)"
  );
}
