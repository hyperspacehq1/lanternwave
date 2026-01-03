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

      {/* Fields */}
      <div className="cm-field">
        <label className="cm-label">First Name</label>
        <input
          className="cm-input"
          value={record?.first_name || ""}
          onChange={(e) => update("first_name", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Last Name</label>
        <input
          className="cm-input"
          value={record?.last_name || ""}
          onChange={(e) => update("last_name", e.target.value)}
        />
      </div>
    </div>
  );
}
