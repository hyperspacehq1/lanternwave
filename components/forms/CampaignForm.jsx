"use client";

import React, { useEffect, useState } from "react";
import CampaignPackageSelect from "@/components/CampaignPackageSelect";

export default function CampaignForm({ record, onChange }) {
  if (!record) return null;

  const update = (field, value) =>
    onChange({ ...record, [field]: value });

  /* ---------------------------------------------
     Campaign change pulse
  --------------------------------------------- */
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1200);
    return () => clearTimeout(t);
  }, [record._campaignName]);

  /* ---------------------------------------------
     Ensure default campaign package exists
  --------------------------------------------- */
  useEffect(() => {
    if (!record.campaignPackage) {
      update("campaignPackage", "standard");
    }
  }, [record.campaignPackage]);

  const isExistingCampaign = Boolean(record.id);

  return (
    <div className="cm-detail-form">

      {/* 🔒 Locked campaign header */}
      <div
        className={`cm-campaign-header ${
          pulse ? "pulse" : ""
        }`}
      >
        Campaign: {record._campaignName || "Unnamed Campaign"}
      </div>

      {/* ------------------------------
         FORM FIELDS
      ------------------------------ */}

      <div className="cm-field">
        <label className="cm-label">Name</label>
        <input
          className="cm-input"
          type="text"
          value={record.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Description</label>
        <textarea
          className="cm-textarea"
          value={record.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">World Setting</label>
        <input
          className="cm-input"
          type="text"
          value={record.worldSetting || ""}
          onChange={(e) => update("worldSetting", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Campaign Date</label>
        <input
          className="cm-input"
          type="date"
          value={record.campaignDate || ""}
          onChange={(e) => update("campaignDate", e.target.value)}
        />
      </div>

      {/* ---------------------------------
         Adventure Codex (Immutable)
      ---------------------------------- */}
      <div className="cm-field">
        <CampaignPackageSelect
          value={record.campaignPackage || "standard"}
          onChange={(value) => update("campaignPackage", value)}
          disabled={isExistingCampaign}
        />

        {isExistingCampaign && (
          <p className="cm-help-text">
            Adventure Codex cannot be changed after campaign creation.
          </p>
        )}
      </div>

      {/* RPG Game */}
      <div className="cm-field">
        <label className="cm-label">RPG Game</label>
        <select
          className="cm-input"
          value={record.rpgGame || ""}
          onChange={(e) =>
            update("rpgGame", e.target.value || null)
          }
        >
          <option value="">— Not specified —</option>
          <option>Avatar Legends: The Roleplaying Game</option>
          <option>Call of Cthulhu</option>
          <option>Coriolis: The Great Dark</option>
          <option>Cyberpunk TTRPG (Red / variants)</option>
          <option>Cypher System / Daggerheart</option>
<option>Delta Green</option>
          <option>Dungeon Crawl Classics (DCC)</option>
          <option>Dungeons & Dragons 5th Edition</option>
          <option>Fabula Ultima</option>
          <option>Land of Eem</option>
          <option>Marvel Multiverse RPG</option>
          <option>Mörk Borg</option>
          <option>Mythic Bastionland</option>
          <option>Nimble 5e</option>
          <option>Pathfinder 2nd Edition</option>
          <option>Savage Worlds</option>
          <option>Shadowrun (6th/updated editions)</option>
          <option>Starfinder 2nd Edition</option>
          <option>StartPlaying</option>
          <option>Tales of the Valiant</option>
          <option>Vampire: The Masquerade 5th Edition</option>
        </select>
      </div>

    </div>
  );
}
