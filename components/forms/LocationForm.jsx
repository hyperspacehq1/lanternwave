// components/forms/LocationForm.jsx
"use client";

import React from "react";

export default function LocationForm({ record, onChange }) {
  if (!record) return null;
  const update = (f, v) => onChange({ ...record, [f]: v });

  return (
    <div className="cm-detail-form">

      <div className="cm-field">
        <label>Description</label>
        <input
          type="text"
          value={record.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Street</label>
        <input
          type="text"
          value={record.street || ""}
          onChange={(e) => update("street", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>City</label>
        <input
          type="text"
          value={record.city || ""}
          onChange={(e) => update("city", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>State</label>
        <input
          type="text"
          value={record.state || ""}
          onChange={(e) => update("state", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Zip</label>
        <input
          type="text"
          value={record.zip || ""}
          onChange={(e) => update("zip", e.target.value)}
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
        <label>Layout</label>
        <textarea
          value={record.layout || ""}
          onChange={(e) => update("layout", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>History</label>
        <textarea
          value={record.history || ""}
          onChange={(e) => update("history", e.target.value)}
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
