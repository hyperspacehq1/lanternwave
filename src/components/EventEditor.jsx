// src/components/EventEditor.jsx
import React, { useEffect, useState } from "react";

export default function EventEditor({
  selectedEvent,
  onSave,
  onArchive,
  onCancel,
  sessionId,
}) {
  //----------------------------------------------------------------------
  // Extract existing event data (if editing)
  //----------------------------------------------------------------------
  const existing = selectedEvent?.event_data || {};

  const [eventType, setEventType] = useState(selectedEvent?.event_type || "");
  const [summary, setSummary] = useState(existing.summary || "");
  const [details, setDetails] = useState(existing.details || "");
  const [severity, setSeverity] = useState(existing.severity || "info");
  const [phoneNumber, setPhoneNumber] = useState(
    selectedEvent?.phone_number || ""
  );

  //----------------------------------------------------------------------
  // Sync form when switching selectedEvent
  //----------------------------------------------------------------------
  useEffect(() => {
    const e = selectedEvent?.event_data || {};
    setEventType(selectedEvent?.event_type || "");
    setSummary(e.summary || "");
    setDetails(e.details || "");
    setSeverity(e.severity || "info");
    setPhoneNumber(selectedEvent?.phone_number || "");
  }, [selectedEvent]);

  //----------------------------------------------------------------------
  // Auto-generated structured JSON (for DB)
  //----------------------------------------------------------------------
  const eventPayload = {
    summary,
    details,
    severity,
  };

  //----------------------------------------------------------------------
  // SAVE ACTION
  //----------------------------------------------------------------------
  function handleSave() {
    if (!summary.trim()) {
      alert("Summary is required.");
      return;
    }

    onSave({
      session_id: sessionId,
      event_type: eventType || "GENERAL",
      phone_number: phoneNumber || null,
      summary,
      details,
      severity,
    });
  }

  //----------------------------------------------------------------------
  // RENDER
  //----------------------------------------------------------------------
  return (
    <div className="event-editor-panel">
      {/* TITLE */}
      <h3 className="editor-title">
        {selectedEvent ? "Edit Event" : "Create Event"}
      </h3>

      {/* EVENT TYPE */}
      <div className="editor-field">
        <label>Event Type</label>
        <input
          type="text"
          value={eventType}
          placeholder="EVENT_TYPE (ex: DISCOVERY, ALERT)"
          onChange={(e) => setEventType(e.target.value)}
        />
      </div>

      {/* SUMMARY */}
      <div className="editor-field">
        <label>Summary (required)</label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>

      {/* DETAILS */}
      <div className="editor-field">
        <label>Details</label>
        <textarea
          rows="4"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
      </div>

      {/* SEVERITY */}
      <div className="editor-field">
        <label>Severity</label>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className={`severity-chip sev-${severity}`}
        >
          <option value="info">info</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
      </div>

      {/* PHONE (optional) */}
      <div className="editor-field">
        <label>Player Phone (optional)</label>
        <input
          type="text"
          placeholder="+1..."
          value={phoneNumber || ""}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
      </div>

      {/* JSON PREVIEW */}
      <div className="editor-json">
        <label>Generated Event JSON</label>
        <pre>{JSON.stringify(eventPayload, null, 2)}</pre>
      </div>

      {/* BUTTONS */}
      <div className="editor-buttons">
        <button onClick={handleSave} className="lw-button">
          Save
        </button>

        {selectedEvent && (
          <button
            onClick={() => onArchive(selectedEvent.id)}
            className="lw-button danger"
          >
            Archive
          </button>
        )}

        <button onClick={onCancel} className="lw-button secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}
