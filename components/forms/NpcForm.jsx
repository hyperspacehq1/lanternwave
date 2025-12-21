"use client";

import React from "react";

export default function NpcForm({ record, onChange }) {
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
        <label>NPC Type</label>
        <input
          type="text"
          value={record.npc_type || ""}
          onChange={(e) => update("npc_type", e.target.value)}
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
        <label>Goals</label>
        <textarea
          value={record.goals || ""}
          onChange={(e) => update("goals", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Faction Alignment</label>
        <textarea
          value={record.faction_alignment || ""}
          onChange={(e) => update("faction_alignment", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Secrets</label>
        <textarea
          value={record.secrets || ""}
          onChange={(e) => update("secrets", e.target.value)}
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
