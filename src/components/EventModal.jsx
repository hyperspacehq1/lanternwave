import React, { useEffect, useState } from "react";

const SEVERITY_OPTIONS = ["info", "low", "medium", "high", "critical"];

const EVENT_TYPES = [
  "player_action",
  "npc_action",
  "discovery",
  "anomaly",
  "system",
  "intel",
  "alert",
  "gm_override",
];

export default function EventModal({
  open,
  onClose,
  onSave,
  initialEvent,
  sessionPlayers,
}) {
  const [eventType, setEventType] = useState("discovery");
  const [severity, setSeverity] = useState("info");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    if (!open) return;

    if (initialEvent) {
      setEventType(initialEvent.event_type || "discovery");
      setSeverity(initialEvent.payload?.severity || "info");
      setSummary(initialEvent.payload?.summary || "");
      setDetails(initialEvent.payload?.details || "");
      setPhoneNumber(initialEvent.phone_number || "");
    } else {
      setEventType("discovery");
      setSeverity("info");
      setSummary("");
      setDetails("");
      setPhoneNumber("");
    }
  }, [open, initialEvent]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: initialEvent?.id,
      event_type: eventType,
      severity,
      summary,
      details,
      phone_number: phoneNumber || null,
    });
  };

  return (
    <div className="lw-modal-overlay">
      <div className="lw-modal">
        <div className="lw-modal-header">
          <h2 className="lw-modal-title">
            {initialEvent ? "Edit Event" : "Add Event"}
          </h2>
          <button className="lw-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="lw-modal-body" onSubmit={handleSubmit}>
          <div className="lw-form-row">
            <label>Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="lw-form-row">
            <label>Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="lw-form-row">
            <label>Summary</label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
            />
          </div>

          <div className="lw-form-row">
            <label>Details</label>
            <textarea
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Optional: narrative description, NPC intel, anomaly notes..."
            />
          </div>

          <div className="lw-form-row">
            <label>Linked Player (optional)</label>
            <select
              value={phoneNumber || ""}
              onChange={(e) => setPhoneNumber(e.target.value)}
            >
              <option value="">— None —</option>
              {sessionPlayers?.map((p) => (
                <option key={p.phone_number} value={p.phone_number}>
                  {p.player_name || p.phone_number}
                </option>
              ))}
            </select>
          </div>

          <div className="lw-modal-footer">
            <button
              type="button"
              className="lw-btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="lw-btn-primary">
              {initialEvent ? "Save Changes" : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
