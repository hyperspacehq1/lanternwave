"use client";

import React, { useEffect, useState } from "react";
import { withContext } from "@/lib/forms/withContext";

const NPC_TYPES = [
  { value: "", label: "— Select type —" },
  { value: "ally", label: "Ally" },
  { value: "enemy", label: "Enemy" },
  { value: "neutral", label: "Neutral" },
  { value: "merchant", label: "Merchant" },
  { value: "authority", label: "Authority" },
  { value: "mystic", label: "Mystic" },
];

export default function NpcForm({ record, campaignName }) {
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

  return (
    <div className="cm-detail-form">

<div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
  <div className="cm-context-line">
    Campaign: {campaignName || "Unnamed Campaign"}
  </div>

  <div className="cm-context-line">
    Session: {record.name || "Unnamed Session"}
  </div>
</div>

      <div className="cm-field">
        <label className="cm-label">
          Name <strong>(required)</strong>
        </label>
        <input
          className="cm-input"
          type="text"
          value={record.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">NPC Type</label>
        <select
          className="cm-input"
          value={record.npc_type || ""}
          onChange={(e) =>
            update("npc_type", e.target.value || null)
          }
        >
          {NPC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
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
        <label className="cm-label">Goals</label>
        <textarea
          className="cm-textarea"
          value={record.goals || ""}
          onChange={(e) => update("goals", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Faction Alignment</label>
        <textarea
          className="cm-textarea"
          value={record.faction_alignment || ""}
          onChange={(e) =>
            update("faction_alignment", e.target.value)
          }
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Secrets</label>
        <textarea
          className="cm-textarea"
          value={record.secrets || ""}
          onChange={(e) => update("secrets", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Notes</label>
        <textarea
          className="cm-textarea"
          value={record.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>
    </div>
  );
}
