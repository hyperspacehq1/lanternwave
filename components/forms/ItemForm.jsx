"use client";

import React, { useEffect, useState } from "react";
import { withContext } from "@/lib/forms/withContext";

export default function ItemForm({ record, onChange }) {
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

      {/* 🔒 Locked campaign header */}
      <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
        Campaign: {record._campaignName || "Unnamed Campaign"}
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
        <label className="cm-label">Item Type</label>
        <input
          className="cm-input"
          type="text"
          value={record.item_type || ""}
          onChange={(e) => update("item_type", e.target.value)}
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
        <label className="cm-label">Notes</label>
        <textarea
          className="cm-textarea"
          value={record.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Properties (JSON)</label>
        <textarea
          className="cm-textarea"
          value={
            record.properties
              ? JSON.stringify(record.properties, null, 2)
              : ""
          }
          onChange={(e) => {
            try {
              update(
                "properties",
                e.target.value ? JSON.parse(e.target.value) : null
              );
            } catch {
              /* allow user to correct JSON before save */
            }
          }}
        />
      </div>
    </div>
  );
}
