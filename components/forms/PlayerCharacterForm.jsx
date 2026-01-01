"use client";

import React, { useEffect, useState } from "react";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

export default function PlayerCharacterForm({ record, onChange }) {
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

  /* --------------------------------------------------
     Update helper
  -------------------------------------------------- */
  const update = (field, value) => {
    onChange({
      ...record,
      [field]: value,
    });
  };

  /* --------------------------------------------------
     UI
  -------------------------------------------------- */
  return (
    <div className="cm-detail-form">
      <div className="cm-campaign-header">
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
