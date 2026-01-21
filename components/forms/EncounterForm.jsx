"use client";

import React, { useEffect, useState } from "react";
import { useCampaignContext } from "@/lib/campaign/campaignContext";
import JoinPanel from "@/components/JoinPanel";

export default function EncounterForm({ record, onChange }) {
  const { campaign } = useCampaignContext();

  /* ------------------------------------------------------------
     Guards
  ------------------------------------------------------------ */
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
        <h3>No Encounter Selected</h3>
        <p>Select an encounter or create a new one.</p>
      </div>
    );
  }

  /* ------------------------------------------------------------
     Campaign-scoped update helper
  ------------------------------------------------------------ */
  const update = (field, value) => {
    onChange({
      ...record,
      [field]: value,
      campaign_id: campaign.id,
    });
  };

  /* ------------------------------------------------------------
     Visual pulse on record change
  ------------------------------------------------------------ */
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [record.id]);

  return (
    <div className="cm-detail-form">
      {/* Header */}
      <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
        <div className="cm-context-line">
          <strong>Campaign:</strong> {campaign.name}
        </div>
        <div className="cm-context-line">
          <strong>Encounter:</strong>{" "}
          {record.name || "Unnamed Encounter"}
        </div>
      </div>

      {/* Name */}
      <div className="cm-field">
        <label className="cm-label">Name</label>
        <input
          className="cm-input"
          value={record.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
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

      {/* Development */}
      <div className="cm-field">
        <label className="cm-label">Development</label>
        <textarea
          className="cm-textarea"
          value={record.development || ""}
          onChange={(e) => update("development", e.target.value)}
          placeholder="How this encounter evolves, escalates, or changes over time…"
        />
      </div>

      {/* Related Entities */}
      {!record._isNew && (
        <>
          <JoinPanel
            title="NPCs"
            encounterId={record.id}
            campaignId={campaign.id}
            joinPath="npcs"
            idField="npc_id"
          />
        </>
      )}

      {record._isNew && (
        <div className="cm-muted">
          Save the encounter before linking NPCs.
        </div>
      )}
    </div>
  );
}
