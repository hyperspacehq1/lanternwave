"use client";

import React from "react";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

export default function PlayerForm({ record, onChange }) {
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
        value={record.first_name || ""}
        onChange={(e) => update("first_name", e.target.value)}
      />
      <input
        className="cm-input"
        value={record.last_name || ""}
        onChange={(e) => update("last_name", e.target.value)}
      />
    </div>
  );
}
