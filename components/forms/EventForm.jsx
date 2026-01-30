"use client";

import React, { useEffect, useState, useRef } from "react";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

export default function EventForm({ record, onChange }) {
  const { campaign } = useCampaignContext();
  const nameInputRef = useRef(null);

  /* ------------------------------------------------------------
     Guard: No campaign selected
  ------------------------------------------------------------ */
  if (!campaign) {
    return (
      <div className="cm-detail-empty">
        <h3>No Campaign Selected</h3>
        <p>Please select or create a campaign to manage events.</p>
      </div>
    );
  }

  /* ------------------------------------------------------------
     Guard: No event selected
  ------------------------------------------------------------ */
  if (!record) {
    return (
      <div className="cm-detail-empty">
        <h3>No Event Selected</h3>
        <p>Select an event or create a new one.</p>
      </div>
    );
  }

  /* ------------------------------------------------------------
     Campaign-scoped update helper (explicit)
  ------------------------------------------------------------ */
  const update = (field, value) => {
    onChange({
      ...record,
      [field]: value,
      campaign_id: campaign.id,
    });
  };

  /* ------------------------------------------------------------
     Visual pulse when switching records
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
          <strong>Event:</strong>{" "}
         <strong>Event:</strong>{" "}
{record._isNew
  ? "New Event"
  : record.name || "Unnamed Event"}
        </div>
      </div>

      {/* ---------------------------------------------
          Event Name
      --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">Name (Required)</label>
        <input
          ref={nameInputRef}
          className="cm-input"
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
          Event Type
      --------------------------------------------- */}
      <div className="cm-field">
  <label className="cm-label">Event Type</label>
  <select
    className="cm-input"
    value={record.eventType || record.event_type || ""}
    onChange={(e) => update("eventType", e.target.value || null)}
  >
    <option value="">— Select Event Type —</option>
    <option value="Scene Event">Scene Event</option>
    <option value="Action Attempt">Action Attempt</option>
    <option value="Roll Result">Roll Result</option>
    <option value="State Change">State Change</option>
    <option value="Information Reveal">Information Reveal</option>
    <option value="Time Advance">Time Advance</option>
    <option value="Consequence Applied">Consequence Applied</option>
  </select>
</div>

      {/* ---------------------------------------------
          Priority
      --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">Priority</label>
        <input
          type="number"
          className="cm-input"
          value={record.priority ?? 0}
          onChange={(e) =>
            update("priority", parseInt(e.target.value, 10) || 0)
          }
        />
      </div>
    </div>
  );
}