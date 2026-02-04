"use client";

import React, { useEffect, useState } from "react";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

const RPG_GAMES = [
  "ALIEN: The Roleplaying Game",
  "Avatar Legends: The Roleplaying Game",
  "Black Powder & Brimstone",
  "Blade Runner: The Roleplaying Game",
  "Call of Cthulhu",
  "Coriolis: The Great Dark",
  "Cyberpunk TTRPG",
  "Cypher System / Daggerheart",
  "Delta Green",
  "Dragonbane",
  "Dungeon Crawl Classics",
  "Dungeons & Dragons 5th Edition",
  "Fabula Ultima",
  "Forbidden Lands",
  "Into the Odd",
  "Invincible: The Roleplaying Game",
  "Land of Eem",
  "Marvel Multiverse RPG",
  "Mörk Borg",
  "Mutant: Year Zero",
  "Mythic Bastionland",
  "Nimble 5e",
  "Pathfinder 2nd Edition",
  "Pirate Borg",
  "Ruins of Symbaroum",
  "Savage Worlds",
  "Shadowrun (6th/updated editions)",
  "Starfinder 2nd Edition",
  "StartPlaying",
  "Symbaroum",
  "Tales from the Loop",
  "Tales of the Valiant",
  "The Electric State Roleplaying Game",
  "The One Ring Roleplaying Game",
  "Vaesen",
  "Vampire: The Masquerade 5th Edition",
  "XYZ-Custom Campaign Codex",
];

export default function CampaignForm({ record, onChange }) {
  const { campaign } = useCampaignContext();

  // --------------------------------------------------
  // Guard
  // --------------------------------------------------
  if (!record) {
    return (
      <div className="cm-detail-empty">
        <h3>No Campaign Selected</h3>
        <p>Please create or select a campaign to continue.</p>
      </div>
    );
  }

  // --------------------------------------------------
  // Unified update helper
  // --------------------------------------------------
 const update = (field, value) => {
  onChange({
    ...record,
    [field]: value,
    // Campaigns do NOT depend on campaign context
  });
};

  // --------------------------------------------------
  // Pulse animation on record change
  // --------------------------------------------------
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [record.id]);

  // --------------------------------------------------
  // Defaults
  // --------------------------------------------------
  useEffect(() => {
    if (!record.campaignPackage) {
      update("campaignPackage", "standard");
    }
  }, [record.campaignPackage]);

  return (
    <div className="cm-detail-form">
      {/* --------------------------------------------- */}
      {/* Header */}
      {/* --------------------------------------------- */}
      <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
        <div className="cm-context-line">
         <strong>Campaign:</strong>{" "}
{record._isNew
  ? "New Campaign"
  : record.name || "Unnamed Campaign"}
        </div>
      </div>

      {/* --------------------------------------------- */}
      {/* Campaign Name */}
      {/* --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">Campaign Name (Required)</label>
        <input
          className="cm-input"
          value={record.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      {/* --------------------------------------------- */}
      {/* Description */}
      {/* --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">Description</label>
        <textarea
          className="cm-textarea"
          value={record.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      {/* --------------------------------------------- */}
      {/* World Setting */}
      {/* --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">World Setting</label>
        <input
          className="cm-input"
          value={record.worldSetting || ""}
          onChange={(e) => update("worldSetting", e.target.value)}
        />
      </div>

      {/* --------------------------------------------- */}
      {/* Campaign Date */}
      {/* --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">Campaign Date</label>
        <input
          type="date"
          className="cm-input"
          value={record.campaignDate || ""}
          onChange={(e) => update("campaignDate", e.target.value)}
        />
      </div>

      {/* --------------------------------------------- */}
      {/* Campaign Package */}
      {/* --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">Campaign Package</label>
        <select
          className="cm-input"
          value={record.campaignPackage || "standard"}
          onChange={(e) => update("campaignPackage", e.target.value)}
        >
          <option value="standard">Standard</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      {/* --------------------------------------------- */}
      {/* RPG Game */}
      {/* --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">RPG Game</label>
        <select
          className="cm-input"
          value={record.rpgGame || ""}
          onChange={(e) => update("rpgGame", e.target.value || null)}
        >
          <option value="">Select a game…</option>
          {RPG_GAMES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
