"use client";

import React, { useEffect, useState } from "react";
import { cmApi } from "@/lib/cm/api";

export default function SessionForm({ record, onChange }) {
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    let cancelled = false;

    cmApi
      .list("campaigns")
      .then((rows) => {
        if (!cancelled) setCampaigns(rows || []);
      })
      .catch((err) => {
        console.error("Failed to load campaigns", err);
        if (!cancelled) setCampaigns([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const update = (field, value) =>
    onChange({ ...record, [field]: value });

  return (
    <div className="cm-detail-form">
      <div className="cm-field">
        <label>Campaign</label>
        <select
          value={record.campaign_id || ""}
          onChange={(e) => update("campaign_id", e.target.value)}
        >
          <option value="">Select campaign…</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="cm-field">
        <label>
          Name <strong>(required)</strong>
        </label>
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
        <label>Notes</label>
        <textarea
          value={record.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>
    </div>
  );
}
