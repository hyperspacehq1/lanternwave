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
    <div className="cm-detail-form campaign-form-custom">
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
          className="cm-select"
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
          className="cm-select"
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

      <style jsx>{`
        /* Override all other select styles with higher specificity */
        .campaign-form-custom :global(.cm-select),
        .campaign-form-custom :global(.cm-field select.cm-select) {
          /* Reset default select styling */
          appearance: none !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          
          /* Custom styling - width fits content */
          width: fit-content !important;
          min-width: 200px !important;
          max-width: 100% !important;
          padding: 8px 32px 8px 12px !important;
          
          /* Colors as specified */
          background-color: transparent !important;
          color: rgb(229, 255, 227) !important;
          border: 1px solid rgb(163, 197, 159) !important;
          outline: none !important;
          
          /* Typography as specified */
          font-family: system-ui, -apple-system, "system-ui", "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          font-size: 13px !important;
          font-weight: 400 !important;
          font-style: normal !important;
          line-height: normal !important;
          
          /* Layout */
          border-radius: 4px !important;
          cursor: pointer !important;
          
          /* Custom dropdown arrow - matches text color */
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgb(229, 255, 227)' d='M6 9L1 4h10z'/%3E%3C/svg%3E") !important;
          background-repeat: no-repeat !important;
          background-position: right 10px center !important;
        }
        
        /* Hover state */
        .campaign-form-custom :global(.cm-select:hover),
        .campaign-form-custom :global(.cm-field select.cm-select:hover) {
          border-color: rgb(180, 210, 177) !important;
        }
        
        /* Focus state */
        .campaign-form-custom :global(.cm-select:focus),
        .campaign-form-custom :global(.cm-field select.cm-select:focus) {
          border-color: rgb(163, 197, 159) !important;
          box-shadow: 0 0 0 2px rgba(163, 197, 159, 0.2) !important;
        }
        
        /* Option styling */
        .campaign-form-custom :global(.cm-select option),
        .campaign-form-custom :global(.cm-field select.cm-select option) {
          background-color: rgb(30, 40, 30) !important;
          color: rgb(229, 255, 227) !important;
          padding: 8px !important;
        }
      `}</style>
    </div>
  );
}

