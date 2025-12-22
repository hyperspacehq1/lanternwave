"use client";

import React from "react";

export default function ItemForm({ record, onChange }) {
  if (!record) return null;

  const update = (field, value) =>
    onChange({ ...record, [field]: value });

  return (
    <div className="cm-detail-form">

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
        <label>Item Type</label>
        <input
          type="text"
          value={record.item_type || ""}
          onChange={(e) => update("item_type", e.target.value)}
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

      <div className="cm-field">
        <label>Properties (JSON)</label>
        <textarea
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
              // intentionally ignore invalid JSON until user fixes it
            }
          }}
        />
      </div>

    </div>
  );
}
