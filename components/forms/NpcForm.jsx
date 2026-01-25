"use client";

import React, { useEffect, useState } from "react";
import { useCampaignContext } from "@/lib/campaign/campaignContext";
import AssetAttachment from "@/components/AssetAttachment";

const NPC_TYPES = [
  { value: "", label: "— Select type —" },
  { value: "ally", label: "Ally" },
  { value: "enemy", label: "Enemy" },
  { value: "neutral", label: "Neutral" },
  { value: "merchant", label: "Merchant" },
  { value: "authority", label: "Authority" },
  { value: "mystic", label: "Mystic" },
];

export default function NpcForm({ record, onChange }) {
  const { campaign } = useCampaignContext();

  /* ---------------------------------------------
     Guards
  --------------------------------------------- */
  if (!campaign) {
    return (
      <div className="cm-detail-empty">
        <h3>No Campaign Selected</h3>
        <p>Please select or create a campaign.</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="cm-detail-empty">
        <h3>No NPC Selected</h3>
        <p>Select an NPC or create a new one.</p>
      </div>
    );
  }

  const isNewNpc = !record.id;

  /* ---------------------------------------------
     Campaign-scoped update helper
  --------------------------------------------- */
  const update = (field, value) => {
    if (typeof onChange !== "function") return;

    onChange({
      ...record,
      [field]: value,
      campaign_id: campaign.id,
    });
  };

  /* ---------------------------------------------
     Visual pulse on record change
  --------------------------------------------- */
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [record.id]);

  /* ---------------------------------------------
     Render
  --------------------------------------------- */
  return (
    <div className="cm-detail-form">
      {/* Header */}
      <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
        <div className="cm-context-line">
          <strong>Campaign:</strong> {campaign.name}
        </div>
        <div className="cm-context-line">
          <strong>Item:</strong>{" "}
{record._isNew
  ? "New NPC"
  : record.name || "Unnamed NPC"}
        </div>
      </div>

      {/* Image attachment (MATCHES Location & Item forms) */}
      {!isNewNpc && (
        <AssetAttachment
          title="Image"
          recordId={record.id}
          recordType="npcs"
        />
      )}

      {/* Name */}
      <div className="cm-field">
        <label className="cm-label">Name</label>
        <input
          className="cm-input"
          value={record.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      {/* NPC Type */}
      <div className="cm-field">
        <label className="cm-label">NPC Type</label>
        <select
          className="cm-input"
          value={record.npc_type || ""}
          onChange={(e) => update("npc_type", e.target.value)}
        >
          {NPC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="cm-field">
        <label className="cm-label">Description</label>
        <textarea
          className="cm-textarea"
          value={record.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      {/* Goals */}
      <div className="cm-field">
        <label className="cm-label">Goals</label>
        <textarea
          className="cm-textarea"
          value={record.goals || ""}
          onChange={(e) => update("goals", e.target.value)}
        />
      </div>

      {/* Secrets */}
      <div className="cm-field">
        <label className="cm-label">Secrets</label>
        <textarea
          className="cm-textarea"
          value={record.secrets || ""}
          onChange={(e) => update("secrets", e.target.value)}
        />
      </div>
    </div>
  );
}
