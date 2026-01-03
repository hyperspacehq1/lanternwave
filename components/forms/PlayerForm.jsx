"use client";

import React, { useEffect, useState } from "react";
import { withContext } from "@/lib/forms/withContext";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

export default function PlayerForm({ record, onChange }) {
  const { campaign } = useCampaignContext();

  /* ------------------------------------------------------------
     Guard: No campaign selected
  ------------------------------------------------------------ */
  if (!campaign) {
    return (
      <div className="cm-detail-empty">
        <h3>No Campaign Selected</h3>
        <p>Please select or create a campaign to manage players.</p>
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
  }, [record?.id]);

  return (
    <div className="cm-detail-form">
      {/* Header */}
      <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
        <div className="cm-context-line">
          <strong>Campaign:</strong> {campaign.name}
        </div>
      </div>

      {/* First Name */}
      <div className="cm-field">
        <label className="cm-label">First Name</label>
        <input
          className="cm-input"
          value={record?.first_name || ""}
          onChange={(e) => update("first_name", e.target.value)}
        />
      </div>

      {/* Last Name */}
      <div className="cm-field">
        <label className="cm-label">Last Name</label>
        <input
          className="cm-input"
          value={record?.last_name || ""}
          onChange={(e) => update("last_name", e.target.value)}
        />
      </div>

      {/* Character Name */}
      <div className="cm-field">
        <label className="cm-label">Character Name</label>
        <input
          className="cm-input"
          value={record?.character_name || ""}
          onChange={(e) => update("character_name", e.target.value)}
        />
      </div>

      {/* Notes */}
      <div className="cm-field">
        <label className="cm-label">Notes</label>
        <textarea
          className="cm-textarea"
          value={record?.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>

      {/* Phone */}
      <div className="cm-field">
        <label className="cm-label">Phone</label>
        <input
          className="cm-input"
          value={record?.phone || ""}
          onChange={(e) => update("phone", e.target.value)}
        />
      </div>

      {/* Email */}
      <div className="cm-field">
        <label className="cm-label">Email</label>
        <input
          type="email"
          className="cm-input"
          value={record?.email || ""}
          onChange={(e) => update("email", e.target.value)}
        />
      </div>

      {/* Initiative Score */}
      <div className="cm-field">
        <label className="cm-label">Initiative Score</label>
        <input
          type="number"
          className="cm-input"
          value={record?.initiative_score ?? 0}
          onChange={(e) =>
            update("initiative_score", parseInt(e.target.value, 10) || 0)
          }
        />
      </div>

      {/* Initiative Bonus */}
      <div className="cm-field">
        <label className="cm-label">Initiative Bonus</label>
        <input
          type="number"
          className="cm-input"
          value={record?.initiative_bonus ?? 0}
          onChange={(e) =>
            update("initiative_bonus", parseInt(e.target.value, 10) || 0)
          }
        />
      </div>
    </div>
  );
}
