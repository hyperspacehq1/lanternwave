"use client";

import React, { useEffect, useState } from "react";
import { withContext } from "@/lib/forms/withContext";
import { useCampaignContext } from "@/lib/campaign/campaignContext";
import JoinPanel from "@/components/JoinPanel";

export default function EncounterForm({ record, onChange }) {
  const { campaign, session } = useCampaignContext();

  /* -----------------------------
     Guards (UNCHANGED)
  ------------------------------ */
  if (!campaign) {
    return (
      <div className="cm-detail-empty">
        <h3>No Campaign Selected</h3>
        <p>Please select a campaign.</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="cm-detail-empty">
        <h3>No Session Selected</h3>
        <p>Please select a session.</p>
      </div>
    );
  }

  /* -----------------------------
     Update helper (UNCHANGED)
  ------------------------------ */
  const update = (field, value) => {
    onChange(
      withContext(
        {
          ...record,
          [field]: value,
        },
        {
          campaign_id: campaign.id,
          session_id: session.id,
        }
      )
    );
  };

  /* ---------------------------------------------
     Pulse on record change (UNCHANGED)
  --------------------------------------------- */
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [record?.id]);

  return (
    <div className="cm-detail-form">
      <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
        <div className="cm-context-line">
          <strong>Campaign:</strong> {campaign.name}
        </div>
        <div className="cm-context-line">
          <strong>Session:</strong> {session.name}
        </div>
      </div>

      {/* -----------------------------
          Core fields (UNCHANGED)
      ------------------------------ */}
      <div className="cm-field">
        <label className="cm-label">Name</label>
        <input
          className="cm-input"
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

      {/* -----------------------------
          Related Entities (FIXED)
      ------------------------------ */}

      <JoinPanel
        title="NPCs"
        encounterId={record.id}
        campaignId={campaign.id}
        joinPath="npcs"
        idField="npc_id"
      />

      <JoinPanel
        title="Items"
        encounterId={record.id}
        campaignId={campaign.id}
        joinPath="items"
        idField="item_id"
      />

      <JoinPanel
        title="Locations"
        encounterId={record.id}
        campaignId={campaign.id}
        joinPath="locations"
        idField="location_id"
      />
    </div>
  );
}
