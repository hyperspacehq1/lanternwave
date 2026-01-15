"use client";

import React, { useEffect, useState } from "react";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

export default function EventForm({ record, onChange }) {
  const { campaign } = useCampaignContext();

  /* ------------------------------------------------------------
     Guard: No campaign selected
  ------------------------------------------------------------ */
  if (!campaign) {
    return (
      <div className="cm-detail-empty">
        <h3>No Campaign Selected</h3>
        <p>Please select or create a campaign to manage events.</p>
      </div>
    );
  }

  /* ------------------------------------------------------------
     Guard: No event selected
  ------------------------------------------------------------ */
  if (!record) {
    return (
      <div className="cm-detail-empty">
        <h3>No Event Selected</h3>
        <p>Select an event or create a new one.</p>
      </div>
    );
  }

  /* ------------------------------------------------------------
     Campaign-scoped update helper (explicit)
  ------------------------------------------------------------ */
  const update = (field, value) => {
    onChange({
      ...record,
      [field]: value,
      campaign_id: campaign.id,
    });
  };

  /* ------------------------------------------------------------
     Visual pulse when switching records
  ------------------------------------------------------------ */
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [record.id]);

  return (
    <div className="cm-detail-form">
      {/* ---------------------------------------------
          Header / Context
      --------------------------------------------- */}
      <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
        <div className="cm-context-line">
          <strong>Campaign:</strong> {campaign.name}
        </div>
        <div className="cm-context-line">
          <strong>Event:</strong>{" "}
          {record.name || "Unnamed Event"}
        </div>
      </div>

      {/* ---------------------------------------------
          Event Name
      --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">Name</label>
        <input
          className="cm-input"
          value={record.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      {/* ---------------------------------------------
          Description
      --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">Description</label>
        <textarea
          className="cm-textarea"
          value={record.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      {/* ---------------------------------------------
          Event Type
      --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">Event Type</label>
        <input
          className="cm-input"
          value={record.event_type || ""}
          onChange={(e) => update("event_type", e.target.value)}
        />
      </div>

      {/* ---------------------------------------------
          Priority
      --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">Priority</label>
        <input
          type="number"
          className="cm-input"
          value={record.priority ?? 0}
          onChange={(e) =>
            update("priority", parseInt(e.target.value, 10) || 0)
          }
        />
      </div>
    </div>
  );
}
