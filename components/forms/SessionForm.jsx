"use client";

import React, { useEffect, useState } from "react";
import { useCampaignContext } from "@/lib/campaign/campaignContext";
import JoinPanel from "@/components/JoinPanel";

export default function SessionForm({ record, onChange }) {
  const { campaign } = useCampaignContext();
  const nameInputRef = React.useRef(null);

  /* ------------------------------------------------------------
     Guard: No campaign selected
  ------------------------------------------------------------ */
  if (!campaign) {
    return (
      <div className="cm-detail-empty">
        <h3>No Campaign Selected</h3>
        <p>Please select or create a campaign before managing sessions.</p>
      </div>
    );
  }

  /* ------------------------------------------------------------
     Guard: No session selected
  ------------------------------------------------------------ */
  if (!record) {
    return (
      <div className="cm-detail-empty">
        <h3>No Session Selected</h3>
        <p>Select a session or create a new one to begin.</p>
      </div>
    );
  }

  /* ------------------------------------------------------------
     Explicit campaign-scoped update helper
  ------------------------------------------------------------ */
  const update = (field, value) => {
    onChange({
      ...record,
      [field]: value,
      campaign_id: campaign.id,
    });
  };

  /* ------------------------------------------------------------
     Visual pulse when switching sessions
  ------------------------------------------------------------ */
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [record.id]);

  /* ------------------------------------------------------------
     Auto-focus name field for new records
  ------------------------------------------------------------ */
  useEffect(() => {
    if (record._isNew && nameInputRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [record._isNew, record.id]);

  return (
    <div className="cm-detail-form">
      {/* ---------------------------------------------
          Header / Context
      --------------------------------------------- */}
      <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
        <div className="cm-context-line">
          <strong>Campaign:</strong> {campaign.name}
        </div>
        <div className="cm-context-line">
         <strong>Session:</strong>{" "}
{record._isNew
  ? "New Session"
  : record.name || "Unnamed Session"}
        </div>
      </div>

      {/* ---------------------------------------------
          Session Name
      --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">Session Name (Required)</label>
        <input
          ref={nameInputRef}
          className="cm-input"
          type="text"
          value={record.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      {/* ---------------------------------------------
          Description
      --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">Description</label>
        <textarea
          className="cm-textarea"
          value={record.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      {/* ---------------------------------------------
          Notes
      --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">Notes</label>
        <textarea
          className="cm-textarea"
          value={record.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>

      {/* ---------------------------------------------
          Related Entities
      --------------------------------------------- */}
      {record._isNew && (
        <div className="cm-muted">
          Save the session before adding encounters, events, or locations.
        </div>
      )}

      {!record._isNew && (
        <>
          <JoinPanel
            title="Encounters"
            campaignId={campaign.id}
            sessionId={record.id}
            joinPath="encounters"
            idField="encounter_id"
          />

          <JoinPanel
            title="Events"
            campaignId={campaign.id}
            sessionId={record.id}
            joinPath="events"
            idField="event_id"
          />

          <JoinPanel
            title="Locations"
            campaignId={campaign.id}
            sessionId={record.id}
            joinPath="locations"
            idField="location_id"
          />
         <JoinPanel
           title="Items"
           campaignId={campaign.id}
           sessionId={record.id}
           joinPath="items"
           idField="item_id"
          />
        </>
      )}
    </div>
  );
}
