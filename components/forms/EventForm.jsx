"use client";

import React, { useEffect, useState } from "react";
import { withContext } from "@/lib/forms/withContext";

const EVENT_TYPES = [
  { value: "", label: "— Select type —" },
  { value: "combat", label: "Combat" },
  { value: "story", label: "Story" },
  { value: "exploration", label: "Exploration" },
  { value: "social", label: "Social" },
  { value: "downtime", label: "Downtime" },
];

export default function EventForm({ record, campaignName }) {
  if (!record) return null;

  const update = (field, value) => {
  onChange(
    withContext(
      {
        ...record,
        [field]: value,
      },
      {
        campaign_id: record.campaign_id,
        session_id: record.session_id,
      }
    )
  );
};
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
     {/* 🔒 Locked campaign + session header */}
<div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
  <div className="cm-context-line">
    Campaign: {record._campaignName || "Unnamed Campaign"}
  </div>

  <div className="cm-context-line">
    Session: {record.name || "Unnamed Session"}
  </div>
</div>

      <div className="cm-field">
        <label className="cm-label">
          Name <strong>(required)</strong>
        </label>
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
        <label className="cm-label">Event Type</label>
        <select
          className="cm-input"
          value={record.event_type || ""}
          onChange={(e) => update("event_type", e.target.value)}
        >
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="cm-field">
        <label className="cm-label">Priority</label>
        <input
          className="cm-input"
          type="number"
          min={0}
          max={100}
          value={record.priority ?? 0}
          onChange={(e) =>
            update("priority", parseInt(e.target.value || "0", 10))
          }
        />
      </div>
    </div>
  );
}
