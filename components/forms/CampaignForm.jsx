"use client";

import React, { useEffect, useState } from "react";
import CampaignPackageSelect from "@/components/CampaignPackageSelect";
import { withContext } from "@/lib/forms/withContext";

export default function CampaignForm({ record, onChange, campaignName }) {
  if (!record) return null;

  const update = (field, value) => {
    onChange(
      withContext(
        {
          ...record,
          [field]: value,
        },
        {
          campaign_id: record.campaign_id,
          session_id: record.session_id,
        }
      )
    );
  };

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

<div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
  <div className="cm-context-line">
    Campaign: {record._campaignName || "Unnamed Campaign"}
  </div>

  <div className="cm-context-line">
    Session: {record.name || "Unnamed Session"}
  </div>
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
          onChange={(e) => update("rpgGame", e.target.value || null)}
        >
          <option value="">— Not specified —</option>
          <option>ALIEN: The Roleplaying Game</option>
          <option>Avatar Legends: The Roleplaying Game</option>
          <option>Black Powder &amp; Brimstone</option>
          <option>Blade Runner: The Roleplaying Game</option>
          <option>Call of Cthulhu</option>
          <option>Coriolis: The Great Dark</option>
          <option>Cyberpunk TTRPG</option>
          <option>Cypher System / Daggerheart</option>
          <option>Delta Green</option>
          <option>Dragonbane</option>
          <option>Dungeon Crawl Classics</option>
          <option>Dungeons &amp; Dragons 5th Edition</option>
          <option>Fabula Ultima</option>
          <option>Forbidden Lands</option>
          <option>Into the Odd</option>
          <option>Invincible: The Roleplaying Game</option>
          <option>Land of Eem</option>
          <option>Marvel Multiverse RPG</option>
          <option>Mörk Borg</option>
          <option>Mutant: Year Zero</option>
          <option>Mythic Bastionland</option>
          <option>Nimble 5e</option>
          <option>Pathfinder 2nd Edition</option>
          <option>Pirate Borg</option>
          <option>Ruins of Symbaroum</option>
          <option>Savage Worlds</option>
          <option>Shadowrun (6th/updated editions)</option>
          <option>Starfinder 2nd Edition</option>
          <option>StartPlaying</option>
          <option>Symbaroum</option>
          <option>Tales from the Loop</option>
          <option>Tales of the Valiant</option>
          <option>The Electric State Roleplaying Game</option>
          <option>The One Ring Roleplaying Game</option>
          <option>Vaesen</option>
          <option>Vampire: The Masquerade 5th Edition</option>
        </select>
      </div>

    </div>
  );
}
