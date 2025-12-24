"use client";

import React, { useEffect, useState } from "react";

export default function CampaignForm({ record, onChange }) {
  if (!record) return null;

  const update = (field, value) =>
    onChange({ ...record, [field]: value });

  /* ---------------------------------------------
     Campaign change pulse
  --------------------------------------------- */
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1200);
    return () => clearTimeout(t);
  }, [record._campaignName]);

  return (
    <div className="cm-detail-form">

      {/* 🔒 Locked campaign header strip */}
      <div
        className={`cm-campaign-header ${
          pulse ? "pulse" : ""
        }`}
      >
        Campaign: {record._campaignName || "Unnamed Campaign"}
      </div>

      {/* ------------------------------
         FORM FIELDS
      ------------------------------ */}

      <div className="cm-field">
        <label className="cm-label">Name</label>
        <input
          className="cm-input"
          type="text"
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
        <label className="cm-label">World Setting</label>
        <input
          className="cm-input"
          type="text"
          value={record.worldSetting || ""}
          onChange={(e) => update("worldSetting", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Campaign Date</label>
        <input
          className="cm-input"
          type="date"
          value={record.campaignDate || ""}
          onChange={(e) => update("campaignDate", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Campaign Package</label>
        <select
          className="cm-input"
          value={record.campaignPackage || "standard"}
          onChange={(e) => update("campaignPackage", e.target.value)}
        >
          <option value="standard">Standard</option>
        </select>
      </div>

    </div>
  );
}
