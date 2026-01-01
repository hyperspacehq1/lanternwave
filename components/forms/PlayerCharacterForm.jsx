"use client";

import React, { useEffect, useState } from "react";
import { withContext } from "@/lib/forms/withContext";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

export default function PlayerCharacterForm({ record }) {
  const { campaign, session } = useCampaignContext();

  /* --------------------------------------------------
     Guards
  -------------------------------------------------- */
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
     Visual pulse on record change
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

      <div className="cm-field">
        <label className="cm-label">First Name</label>
        <input
          className="cm-input"
          value={record.firstName || ""}
          onChange={(e) => update("firstName", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Last Name</label>
        <input
          className="cm-input"
          value={record.lastName || ""}
          onChange={(e) => update("lastName", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Character Name</label>
        <input
          className="cm-input"
          value={record.characterName || ""}
          onChange={(e) => update("characterName", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Email</label>
        <input
          className="cm-input"
          type="email"
          value={record.email || ""}
          onChange={(e) => update("email", e.target.value)}
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
