"use client";

import React from "react";

export default function EventForm({ record, onChange }) {
  const update = (field, value) =>
    onChange({ ...record, [field]: value });

  return (
    <div className="cm-detail-form">
      {/* Read-only Campaign Context */}
      {record._campaignName && (
        <div className="cm-context-badge">
          <strong>Campaign:</strong> {record._campaignName}
        </div>
      )}

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
        <label>Event Type</label>
        <input
          type="text"
          value={record.event_type || ""}
          onChange={(e) => update("event_type", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Priority</label>
        <input
          type="number"
          value={record.priority ?? 0}
          onChange={(e) =>
            update("priority", parseInt(e.target.value || "0", 10))
          }
        />
      </div>
    </div>
  );
}
