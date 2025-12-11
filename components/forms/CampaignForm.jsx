"use client";

import React from "react";

export default function CampaignForm({ record, onChange }) {
  if (!record) return null;

  const update = (field, value) =>
    onChange({ ...record, [field]: value });

  return (
    <div className="cm-detail-form">

      <div className="cm-field">
        <label>Name</label>
        <input
          type="text"
          value={record.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Description</label>
        <textarea
          value={record.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>World Setting</label>
        <input
          type="text"
          value={record.world_setting || ""}
          onChange={(e) => update("world_setting", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Campaign Date</label>
        <input
          type="date"
          value={record.campaign_date || ""}
          onChange={(e) => update("campaign_date", e.target.value)}
        />
      </div>

    </div>
  );
}
