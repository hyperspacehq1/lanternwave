// components/forms/LogForm.jsx
"use client";

import React, { useEffect, useState } from "react";
// import { cmApi } from "@/lib/cm/client";

export default function LogForm({ record, onChange }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    cmApi.list("sessions").then(setSessions);
  }, []);

  const update = (f, v) => onChange({ ...record, [f]: v });

  return (
    <div className="cm-detail-form">

      <div className="cm-field">
        <label>Session</label>
        <select
          value={record.sessionId || ""}
          onChange={(e) => update("sessionId", e.target.value)}
        >
          <option value="">Select…</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.description}</option>
          ))}
        </select>
      </div>

      <div className="cm-field">
        <label>Title</label>
        <input
          type="text"
          value={record.title || ""}
          onChange={(e) => update("title", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Body</label>
        <textarea
          value={record.body || ""}
          onChange={(e) => update("body", e.target.value)}
        />
      </div>

    </div>
  );
}
