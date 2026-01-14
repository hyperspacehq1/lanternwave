"use client";

import React, { useEffect, useState } from "react";
import { withContext } from "@/lib/forms/withContext";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

export default function EventForm({ record, onChange }) {
  const { campaign, session } = useCampaignContext();

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
     Guard: No session selected
  ------------------------------------------------------------ */
  if (!session) {
    return (
      <div className="cm-detail-empty">
        <h3>No Session Selected</h3>
        <p>Please select or create a session to manage events.</p>
      </div>
    );
  }

  /* ------------------------------------------------------------
     ✅ MISSING GUARD (THIS FIX)
  ------------------------------------------------------------ */
  if (!record) {
    return (
      <div className="cm-detail-empty">
        <h3>No Event Selected</h3>
        <p>Select an event or create a new one.</p>
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
     Visual pulse when record changes
  --------------------------------------------- */
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [record.id]);

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
