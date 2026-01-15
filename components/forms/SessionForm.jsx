"use client";

import React from "react";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

export default function SessionForm({ record, onChange }) {
  const { campaign } = useCampaignContext();

  if (!campaign || !record) {
    return <div className="cm-detail-empty">Select a Record</div>;
  }

  const update = (field, value) => {
    onChange({ ...record, [field]: value, campaign_id: campaign.id });
  };

  return (
    <div className="cm-detail-form">
      <input
        className="cm-input"
        value={record.name || ""}
        onChange={(e) => update("name", e.target.value)}
      />
      <textarea
        className="cm-textarea"
        value={record.notes || ""}
        onChange={(e) => update("notes", e.target.value)}
      />
    </div>
  );
}
