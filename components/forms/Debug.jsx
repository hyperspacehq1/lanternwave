"use client";

import React from "react";

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randWord() {
  const words = [
    "Hammer",
    "Lantern",
    "Waves",
    "Arkham",
    "Beacon",
    "Midnight",
    "Rift",
    "Cinder",
    "Obsidian",
    "Runefall",
    "Ember",
    "Hollow",
  ];
  return words[randInt(0, words.length - 1)];
}

function randSentence() {
  return `${randWord()} ${randWord()} ${randWord()} ${randInt(1, 9999)}`;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function makeRandomCampaign() {
  return {
    name: `Debug ${randWord()} ${randInt(100, 999)}`,
    description: randSentence(),
    world_setting: randWord(),
    campaign_date: todayISO(),
    campaign_package: "standard",
  };
}

export default function DebugForm({ value, onChange }) {
  const v = value || makeRandomCampaign();

  const set = (k, next) => onChange({ ...v, [k]: next });

  return (
    <div style={{ display: "grid", gap: 12, marginBottom: 14 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <label>Name</label>
        <input
          value={v.name || ""}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label>Description</label>
        <textarea
          value={v.description || ""}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label>World Setting</label>
        <input
          value={v.world_setting || ""}
          onChange={(e) => set("world_setting", e.target.value)}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label>Campaign Date</label>
        <input
          type="date"
          value={v.campaign_date || ""}
          onChange={(e) => set("campaign_date", e.target.value)}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label>Campaign Package</label>
        <select
          value={v.campaign_package || "standard"}
          onChange={(e) => set("campaign_package", e.target.value)}
        >
          <option value="standard">Standard</option>
        </select>
      </div>
    </div>
  );
}
