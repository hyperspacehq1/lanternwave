// components/forms/QuestForm.jsx
"use client";

import React, { useState, useEffect } from "react";
import { cmApi } from "@/lib/cm/client";

export default function QuestForm({ record, onChange }) {
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    cmApi.list("campaigns").then(setCampaigns);
  }, []);

  const update = (f, v) => onChange({ ...record, [f]: v });

  return (
    <div className="cm-detail-form">

      <div className="cm-field">
        <label>Campaign</label>
        <select
          value={record.campaignId || ""}
          onChange={(e) => update("campaignId", e.target.value)}
        >
          <option value="">Select…</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="cm-field">
        <label>Description</label>
        <textarea
          value={record.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Status</label>
        <input
          type="text"
          value={record.status || ""}
          onChange={(e) => update("status", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Notes</label>
        <textarea
          value={record.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>

    </div>
  );
}
