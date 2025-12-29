"use client";

import React, { useEffect, useState } from "react";
import JoinPanel from "@/components/JoinPanel";

export default function EncounterForm({ record, onChange }) {
  if (!record) return null;

  const [isPersisted, setIsPersisted] = useState(false);

  // Mark as persisted once the encounter has a real ID
  useEffect(() => {
    if (record?.id) {
      setIsPersisted(true);
    }
  }, [record?.id]);

  const update = (field, value) =>
    onChange({ ...record, [field]: value });

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

      {/* Campaign Header */}
      <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
        Campaign: {record._campaignName || "Unnamed Campaign"}
      </div>

      {/* ---------------- Core Fields ---------------- */}

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

      {/* ---------------- JOINED DATA ---------------- */}
      {isPersisted ? (
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
      ) : (
        <div className="cm-muted-note">
          Save the encounter to add NPCs, items, or locations.
        </div>
      )}
    </div>
  );
}
