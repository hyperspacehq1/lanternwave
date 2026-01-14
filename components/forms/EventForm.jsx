"use client";

import React, { useEffect, useState } from "react";
import { withContext } from "@/lib/forms/withContext";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

export default function EventForm({ record, onChange }) {
  const { campaign } = useCampaignContext();

  /* ------------------------------------------------------------
     Guard: No campaign selected
  ------------------------------------------------------------ */
  if (!campaign) {
    return (
      <div className="cm-detail-empty">
        Select a Campaign from the Campaign tab
      </div>
    );
  }

  /* ------------------------------------------------------------
     Guard: No record selected
  ------------------------------------------------------------ */
  if (!record) {
    return (
      <div className="cm-detail-empty">
        Select a Record from the List to view Details
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
        }
      )
    );
  };

  /* ---------------------------------------------
     Visual pulse when record changes
  --------------------------------------------- */
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [record.id]);

  return (
    <div className={`cm-detail-form ${pulse ? "pulse" : ""}`}>
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

      <div className="cm-field">
        <label className="cm-label">Event Type</label>
        <input
          className="cm-input"
          value={record.event_type || ""}
          onChange={(e) => update("event_type", e.target.value)}
        />
      </div>

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
