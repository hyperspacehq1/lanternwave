export const TOOLTIPS = {
  /* ============================
     ACCOUNT PAGE
  ============================ */
  account: {
    player_characters: {
      title: "Player Characters Beacon",
      body:
        "-Shows player characters in the GM Dashboard, allowing quick reference during sessions so you can refer to players by their character name.",
    },

    npc_pulse: {
      title: "NPC Pulse Beacon",
      body:
        "-Displays the NPC’s image in the Player viewer. One control shows it briefly, while another keeps it visible longer.",
    },

    item_pulse: {
      title: "Item Pulse Beacon",
      body:
        "-Adds a gold button that enables the GM to display the Item’s image to players for 10 seconds on the Player viewer.",
    },

    location_pulse: {
      title: "Location Pulse Beacon",
      body:
        "-Adds a gold button that enables the GM to display the Location’s image to players for 10 seconds on the Player viewer.",
    },

    player_sanity_tracker: {
      title: "Player Sanity Tracker",
      body:
        "-Enables live sanity tracking for player characters during sessions, allowing the GM to apply and broadcast sanity changes in real time.",
    },
  },

  /* ============================
     PLAYER VIEW
  ============================ */
  player: {
    help: {
      title: "Player View",
      body:
        "Designed to run on a separate screen for players. The GM controls what appears here from the Controller on their own device. For best results, open the Player Viewer on an iPad or extended display using built-in screen sharing tools like AirPlay, Sidecar, or Miracast, and move the Player tab to the shared screen.",
    },
  },
  /* ============================
     AUDIO
  ============================ */
account: {
  audio_player: {
    title: "Player Audio Output",
    body:
      "When enabled, audio will also play on the Player Page. " +
      "Disable this if you prefer audio to play only from the GM Controller.",
  },
}
};
