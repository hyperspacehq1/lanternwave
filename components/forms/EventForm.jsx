"use client";

import React, { useEffect, useState } from "react";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

export default function EventForm({ record, onChange }) {
  const { campaign } = useCampaignContext();

  if (!campaign) return <div className="cm-detail-empty">Select a Campaign</div>;
  if (!record) return <div className="cm-detail-empty">Select a Record</div>;

  const update = (field, value) => {
    onChange({ ...record, [field]: value, campaign_id: campaign.id });
  };

  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [record.id]);

  return (
    <div className={`cm-detail-form ${pulse ? "pulse" : ""}`}>
      <input
        className="cm-input"
        value={record.name || ""}
        onChange={(e) => update("name", e.target.value)}
      />
      <textarea
        className="cm-textarea"
        value={record.description || ""}
        onChange={(e) => update("description", e.target.value)}
      />
    </div>
  );
}
