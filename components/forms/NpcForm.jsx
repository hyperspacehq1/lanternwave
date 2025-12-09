// components/forms/NpcForm.jsx
"use client";

import React from "react";

export default function NpcForm({ record, onChange }) {
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
        <label>NPC Type</label>
        <input
          type="text"
          value={record.npcType || ""}
          onChange={(e) => update("npcType", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Personality</label>
        <textarea
          value={record.personality || ""}
          onChange={(e) => update("personality", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Goals</label>
        <textarea
          value={record.goals || ""}
          onChange={(e) => update("goals", e.target.value)}
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
        <label>Appearances</label>
        <textarea
          value={record.appearances || ""}
          onChange={(e) => update("appearances", e.target.value)}
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
