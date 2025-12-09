// components/forms/PlayerCharacterForm.jsx
"use client";
import React from "react";

export default function PlayerCharacterForm({ record, onChange }) {
  if (!record) return null;
  const update = (f, v) => onChange({ ...record, [f]: v });

  return (
    <div className="cm-detail-form">

      <div className="cm-field">
        <label>First Name</label>
        <input
          type="text"
          value={record.firstName || ""}
          onChange={(e) => update("firstName", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Last Name</label>
        <input
          type="text"
          value={record.lastName || ""}
          onChange={(e) => update("lastName", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Phone</label>
        <input
          type="text"
          value={record.phone || ""}
          onChange={(e) => update("phone", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Email</label>
        <input
          type="email"
          value={record.email || ""}
          onChange={(e) => update("email", e.target.value)}
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
