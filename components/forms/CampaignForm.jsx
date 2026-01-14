"use client";

import React, { useEffect, useState } from "react";
import { withContext } from "@/lib/forms/withContext";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

export default function CampaignForm({ record, onChange }) {
  const { campaign } = useCampaignContext();

  if (!campaign) {
    return (
      <div className="cm-detail-empty">
        Select a Campaign from the Campaign tab
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

  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [record?.id]);

  useEffect(() => {
    if (!record?.campaignPackage) {
      update("campaignPackage", "standard");
    }
  }, [record?.campaignPackage]);

  return (
    <div className={`cm-detail-form ${pulse ? "pulse" : ""}`}>
      <div className="cm-field">
        <label className="cm-label">Campaign Name</label>
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

      <div className="cm-field">
        <label className="cm-label">World Setting</label>
        <input
          className="cm-input"
          value={record?.worldSetting || ""}
          onChange={(e) => update("worldSetting", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Campaign Date</label>
        <input
          className="cm-input"
          type="date"
          value={record?.campaignDate || ""}
          onChange={(e) => update("campaignDate", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Campaign Package</label>
        <select
          className="cm-input"
          value={record?.campaignPackage || "standard"}
          onChange={(e) => update("campaignPackage", e.target.value)}
        >
          <option value="standard">Standard</option>
          <option value="premium">Premium</option>
        </select>
      </div>
    </div>
  );
}
