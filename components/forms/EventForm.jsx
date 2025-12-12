// components/forms/EventForm.jsx
"use client";

import React, { useEffect, useState } from "react";
// Import { cmApi } from "@/lib/cm/client";

export default function EventForm({ record, onChange }) {
  const [campaigns, setCampaigns] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    cmApi.list("campaigns").then(setCampaigns);
    cmApi.list("sessions").then(setSessions);
    cmApi.list("npcs").then(setNpcs);
    cmApi.list("items").then(setItems);
    cmApi.list("locations").then(setLocations);
  }, []);

  const update = (field, value) =>
    onChange({ ...record, [field]: value });

  const toggleMulti = (field, id) => {
    const prev = record[field] || [];
    const exists = prev.includes(id);
    update(field, exists ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="cm-detail-form">

      <div className="cm-field">
        <label>Campaign</label>
        <select
          value={record.campaignId || ""}
          onChange={(e) => update("campaignId", e.target.value)}
        >
          <option value="">Select...</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="cm-field">
        <label>Session</label>
        <select
          value={record.sessionId || ""}
          onChange={(e) => update("sessionId", e.target.value)}
        >
          <option value="">Select...</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.description}</option>
          ))}
        </select>
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
          value={record.eventType || ""}
          onChange={(e) => update("eventType", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Weather</label>
        <input
          type="text"
          value={record.weather || ""}
          onChange={(e) => update("weather", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Trigger Detail</label>
        <textarea
          value={record.triggerDetail || ""}
          onChange={(e) => update("triggerDetail", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Priority</label>
        <input
          type="number"
          value={record.priority || 0}
          onChange={(e) => update("priority", parseInt(e.target.value))}
        />
      </div>

      <div className="cm-field">
        <label>Countdown (minutes)</label>
        <input
          type="number"
          value={record.countdownMinutes || 0}
          onChange={(e) => update("countdownMinutes", parseInt(e.target.value))}
        />
      </div>

      {/* Multi-select NPCs */}
      <div className="cm-field">
        <label>NPCs</label>
        <div className="cm-multiselect">
          {npcs.map((npc) => (
            <div
              key={npc.id}
              className={
                (record.npcIds || []).includes(npc.id)
                  ? "ms-item selected"
                  : "ms-item"
              }
              onClick={() => toggleMulti("npcIds", npc.id)}
            >
              {npc.firstName} {npc.lastName}
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="cm-field">
        <label>Items</label>
        <div className="cm-multiselect">
          {items.map((it) => (
            <div
              key={it.id}
              className={
                (record.itemIds || []).includes(it.id)
                  ? "ms-item selected"
                  : "ms-item"
              }
              onClick={() => toggleMulti("itemIds", it.id)}
            >
              {it.description}
            </div>
          ))}
        </div>
      </div>

      {/* Locations */}
      <div className="cm-field">
        <label>Locations</label>
        <div className="cm-multiselect">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className={
                (record.locationIds || []).includes(loc.id)
                  ? "ms-item selected"
                  : "ms-item"
              }
              onClick={() => toggleMulti("locationIds", loc.id)}
            >
              {loc.description}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
