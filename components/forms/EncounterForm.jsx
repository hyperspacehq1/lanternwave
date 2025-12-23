"use client";

import JoinPanel from "@/components/JoinPanel";

export default function EncounterForm({ record, onChange }) {
  if (!record) return null;

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

      {/* ---------------- Core Fields ---------------- */}
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
        <label>Notes</label>
        <textarea
          value={record.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>

      {/* ---------------- Join Panels ---------------- */}
      {record.id && (
        <>
          <JoinPanel
            title="NPCs in Encounter"
            encounterId={record.id}
            campaignId={record.campaign_id}
            joinPath="npcs"
            idField="npc_id"
            labelField="name"
          />

          <JoinPanel
            title="Items in Encounter"
            encounterId={record.id}
            campaignId={record.campaign_id}
            joinPath="items"
            idField="item_id"
            labelField="name"
          />

          <JoinPanel
            title="Locations in Encounter"
            encounterId={record.id}
            campaignId={record.campaign_id}
            joinPath="locations"
            idField="location_id"
            labelField="name"
          />
        </>
      )}
    </div>
  );
}
