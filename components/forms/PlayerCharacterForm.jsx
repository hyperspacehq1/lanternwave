"use client";

import React, { useEffect, useState } from "react";

export default function PlayerCharacterForm({ record, onChange }) {
  if (!record) return null;

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

      {/* 🔒 Locked campaign header */}
      <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
        Campaign: {record._campaignName || "Unnamed Campaign"}
      </div>

      <div className="cm-field">
        <label className="cm-label">
          First Name <strong>(required)</strong>
        </label>
        <input
          className="cm-input"
          type="text"
          value={record.firstName || ""}
          onChange={(e) => update("firstName", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">
          Last Name <strong>(required)</strong>
        </label>
        <input
          className="cm-input"
          type="text"
          value={record.lastName || ""}
          onChange={(e) => update("lastName", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Phone</label>
        <input
          className="cm-input"
          type="text"
          value={record.phone || ""}
          onChange={(e) => update("phone", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Email</label>
        <input
          className="cm-input"
          type="email"
          value={record.email || ""}
          onChange={(e) => update("email", e.target.value)}
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
    </div>
  );
}
