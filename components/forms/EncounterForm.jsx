"use client";

import React from "react";
import { withContext } from "@/lib/forms/withContext";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

export default function EncounterForm({ record, onChange }) {
  const { campaign } = useCampaignContext();

  if (!campaign) {
    return <div className="cm-detail-empty">
      Select a Campaign from the Campaign tab
    </div>;
  }

  const update = (field, value) => {
    onChange(
      withContext(
        { ...record, [field]: value },
        { campaign_id: campaign.id }
      )
    );
  };

  return (
    <div className="cm-detail-form">
      <div className="cm-field">
        <label className="cm-label">Name</label>
        <input
          className="cm-input"
          value={record?.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Description</label>
        <textarea
          className="cm-textarea"
          value={record?.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>
    </div>
  );
}
