// components/forms/SessionForm.jsx
"use client";
import React, { useEffect, useState } from "react";
import { cmApi } from "@/lib/cm/client";

export default function SessionForm({ record, onChange }) {
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    cmApi.list("campaigns").then(setCampaigns);
  }, []);

  const update = (field, value) =>
    onChange({ ...record, [field]: value });

  return (
    <div className="cm-detail-form">

      <div className="cm-field">
        <label>Campaign</label>
        <select
          value={record.campaignId || ""}
          onChange={(e) => update("campaignId", e.target.value)}
        >
          <option value="">Select campaign...</option>
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
        <label>Geography</label>
        <textarea
          value={record.geography || ""}
          onChange={(e) => update("geography", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Notes</label>
        <textarea
          value={record.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>History</label>
        <textarea
          value={record.history || ""}
          onChange={(e) => update("history", e.target.value)}
        />
      </div>

    </div>
  );
}
