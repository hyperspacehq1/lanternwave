"use client";

import React, { useEffect, useState } from "react";
import { withContext } from "@/lib/forms/withContext";

export default function PlayerCharacterForm({ record, onChange }) {
  if (!record) return null;

  // Always preserve campaign_id (and session_id if ever added)
  const campaignId =
    record.campaign_id ||
    record._campaign_id ||
    record._campaignId ||
    null;

  const sessionId =
    record.session_id ||
    record._session_id ||
    record._sessionId ||
    null;

  const update = (field, value) => {
  onChange(
    withContext(
      {
        ...record,
        [field]: value,
      },
      {
        campaign_id: record.campaign_id,
        session_id: record.session_id,
      }
    )
  );
};

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
      
<div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
  <div className="cm-context-line">
    Campaign: {record._campaignName || "Unnamed Campaign"}
  </div>
  <div className="cm-context-line">
    Session: {record.name || "Unnamed Session"}
  </div>
</div>

      {/* FIRST NAME */}
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

      {/* LAST NAME */}
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

      {/* CHARACTER NAME */}
      <div className="cm-field">
        <label className="cm-label">Character Name</label>
        <input
          className="cm-input"
          type="text"
          value={record.characterName || ""}
          onChange={(e) => update("characterName", e.target.value)}
        />
      </div>

      {/* PHONE */}
      <div className="cm-field">
        <label className="cm-label">Phone</label>
        <input
          className="cm-input"
          type="text"
          value={record.phone || ""}
          onChange={(e) => update("phone", e.target.value)}
        />
      </div>

      {/* EMAIL */}
      <div className="cm-field">
        <label className="cm-label">Email</label>
        <input
          className="cm-input"
          type="email"
          value={record.email || ""}
          onChange={(e) => update("email", e.target.value)}
        />
      </div>

      {/* NOTES */}
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
