// components/forms/ItemForm.jsx
"use client";

import React from "react";

export default function ItemForm({ record, onChange }) {
  if (!record) return null;
  const update = (f, v) => onChange({ ...record, [f]: v });

  return (
    <div className="cm-detail-form">

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
