"use client";

import React, { useEffect, useState } from "react";
import { cmApi } from "@/lib/cm/api";

export default function EventForm({ record, onChange }) {
  const [campaigns, setCampaigns] = useState([]);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [campaignRows, sessionRows] = await Promise.all([
          cmApi.list("campaigns"),
          cmApi.list("sessions"),
        ]);

        if (cancelled) return;

        setCampaigns(Array.isArray(campaignRows) ? campaignRows : []);
        setSessions(Array.isArray(sessionRows) ? sessionRows : []);
      } catch (err) {
        console.error("Failed to load event dependencies", err);
        if (!cancelled) {
          setCampaigns([]);
          setSessions([]);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (field, value) =>
    onChange({ ...record, [field]: value });

  return (
    <div className="cm-detail-form">
      <div className="cm-field">
        <label>Campaign</label>
        <select
          value={record.campaign_id || ""}
          onChange={(e) => update("campaign_id", e.target.value)}
        >
          <option value="">Select campaign…</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="cm-field">
        <label>Session</label>
        <select
          value={record.session_id || ""}
          onChange={(e) => update("session_id", e.target.value)}
        >
          <option value="">Select session…</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

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
        <label>Event Type</label>
        <input
          type="text"
          value={record.event_type || ""}
          onChange={(e) => update("event_type", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Priority</label>
        <input
          type="number"
          value={record.priority ?? 0}
          onChange={(e) =>
            update("priority", parseInt(e.target.value || "0", 10))
          }
        />
      </div>
    </div>
  );
}
