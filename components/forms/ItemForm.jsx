"use client";

import React, { useEffect, useState } from "react";
import { withContext } from "@/lib/forms/withContext";

export default function ItemForm({
  record,
  onChange,
  campaignName,
  sessionName,
}) {
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

  // Visual pulse when switching records
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1200);
    return () => clearTimeout(t);
  }, [record.id]);

  return (
    <div className="cm-detail-form">
      {/* HEADER */}
      <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
        <div className="cm-context-line">
          Campaign: {campaignName || "Unnamed Campaign"}
        </div>
        <div className="cm-context-line">
          Session: {sessionName || "New Session"}
        </div>
      </div>

      {/* NAME */}
      <div className="cm-field">
        <label className="cm-label">Name</label>
        <input
          className="cm-input"
          value={record.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      {/* ITEM TYPE */}
      <div className="cm-field">
        <label className="cm-label">Item Type</label>
        <input
          className="cm-input"
          value={record.item_type || ""}
          onChange={(e) => update("item_type", e.target.value)}
        />
      </div>

      {/* DESCRIPTION */}
      <div className="cm-field">
        <label className="cm-label">Description</label>
        <textarea
          className="cm-textarea"
          value={record.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      {/* NOTES */}
      <div className="cm-field">
        <label className="cm-label">Notes</label>
        <textarea
          className="cm-textarea"
          value={record.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>

      {/* PROPERTIES */}
      <div className="cm-field">
        <label className="cm-label">Properties</label>
        <textarea
          className="cm-textarea"
          value={record.properties || ""}
          onChange={(e) => update("properties", e.target.value)}
        />
      </div>
    </div>
  );
}
