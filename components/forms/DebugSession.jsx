"use client";

import { v4 as uuidv4 } from "uuid";

export function makeRandomSession() {
  return {
    campaign_id: "",
    name: `Session ${uuidv4().slice(0, 6)}`,
    description: "",
    notes: "",
  };
}

export default function DebugSessionForm({
  value,
  campaigns,
  onChange,
}) {
  const update = (field, v) =>
    onChange({ ...value, [field]: v });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label>
        Campaign
        <select
          value={value.campaign_id || ""}
          onChange={(e) =>
            update("campaign_id", e.target.value)
          }
        >
          <option value="">Select campaign…</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Name (required)
        <input
          type="text"
          value={value.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </label>

      <label>
        Description
        <textarea
          value={value.description || ""}
          onChange={(e) =>
            update("description", e.target.value)
          }
        />
      </label>

      <label>
        Notes
        <textarea
          value={value.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
        />
      </label>
    </div>
  );
}
