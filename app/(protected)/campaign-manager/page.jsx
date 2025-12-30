"use client";

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { cmApi } from "@/lib/cm/api";
import { getFormComponent } from "@/components/forms";

import "./campaign-manager.css";

/* ------------------------------------------------------------
   Entity rules
------------------------------------------------------------ */
const ENTITY_RULES = {
  campaigns: {},
  sessions: { campaign: true },
  "player-characters": { campaign: true },
  npcs: { campaign: true },
  locations: { campaign: true },
  items: { campaign: true },
  events: { campaign: true, session: true },
  encounters: { campaign: true },
};

const CONTAINER_TYPES = [
  { id: "campaigns", label: "Campaigns" },
  { id: "sessions", label: "Sessions" },
  { id: "events", label: "Events" },
  { id: "player-characters", label: "Player Characters" },
  { id: "npcs", label: "NPCs" },
  { id: "encounters", label: "Encounters" },
  { id: "locations", label: "Locations" },
  { id: "items", label: "Items" },
];

export default function CampaignManagerPage() {
  const [activeType, setActiveType] = useState("campaigns");
  const [records, setRecords] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [loading, setLoading] = useState(false);

  const [campaigns, setCampaigns] = useState([]);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);

  /* ------------------ LOAD CAMPAIGNS ------------------ */
  useEffect(() => {
    cmApi.list("campaigns").then(setCampaigns);
  }, []);

  useEffect(() => {
    if (!activeCampaignId && campaigns.length) {
      setActiveCampaignId(campaigns[0].id);
    }
  }, [campaigns, activeCampaignId]);

  const rules = ENTITY_RULES[activeType] || {};
  const campaignRequired =
    activeType !== "campaigns" && rules.campaign && !activeCampaignId;

  /* ------------------ LOAD RECORDS ------------------ */
  useEffect(() => {
    if (campaignRequired) return;

    let cancelled = false;

    async function load() {
      setLoading(true);

      let list = [];
      if (rules.campaign) {
        const res = await fetch(`/api/${activeType}?campaign_id=${activeCampaignId}`);
        list = await res.json();
      } else {
        list = await cmApi.list(activeType);
      }

      if (!cancelled) {
        setRecords((p) => ({ ...p, [activeType]: list }));
        setSelectedId(list?.[0]?.id ?? null);
        setSelectedRecord(list?.[0] ?? null);

        if (activeType === "sessions" && list.length) {
          setActiveSessionId(list[0].id);
        }
      }

      setLoading(false);
    }

    load();
    return () => (cancelled = true);
  }, [activeType, activeCampaignId]);

  /* ------------------ CREATE ------------------ */
  const handleCreate = () => {
    if (loading) return;

    if (activeType === "events" && !activeSessionId) {
      alert("Please select a session first.");
      return;
    }

    const base = {
      id: uuidv4(),
      _isNew: true,
      campaign_id: activeCampaignId,
      name: `New ${activeType.slice(0, -1)}`,
    };

    if (activeType === "events") base.session_id = activeSessionId;

    setRecords((p) => ({
      ...p,
      [activeType]: [base, ...(p[activeType] || [])],
    }));

    setSelectedId(base.id);
    setSelectedRecord(base);
    setSaveStatus("unsaved");
  };

  /* ------------------ SAVE ------------------ */
  const handleSave = async () => {
    if (!selectedRecord || loading) return;

    setSaveStatus("saving");

    const { _isNew, id, ...payload } = selectedRecord;

    const saved = _isNew
      ? await cmApi.create(activeType, payload)
      : await cmApi.update(activeType, id, payload);

    const refreshed = await cmApi.get(activeType, saved.id);

    setRecords((p) => ({
      ...p,
      [activeType]: p[activeType].map((r) =>
        r.id === refreshed.id ? refreshed : r
      ),
    }));

    setSelectedRecord(refreshed);
    setSaveStatus("saved");
  };

  /* ------------------ DELETE ------------------ */
  const handleDelete = async () => {
    if (!selectedRecord?.id || loading) return;

    await cmApi.remove(activeType, selectedRecord.id);

    setRecords((p) => ({
      ...p,
      [activeType]: p[activeType].filter((r) => r.id !== selectedRecord.id),
    }));

    setSelectedRecord(null);
    setSaveStatus("idle");
  };

  return (
    <div className="cm-root">
      <div className="cm-layout">
        <aside className="cm-sidebar">
          <h1 className="cm-title">Campaign Manager</h1>

          {CONTAINER_TYPES.map((c) => (
            <button
              key={c.id}
              className={`cm-container-btn ${
                c.id === activeType ? "active" : ""
              }`}
              onClick={() => setActiveType(c.id)}
            >
              {c.label}
            </button>
          ))}

          <div className="cm-save-status">Status: {saveStatus}</div>
        </aside>

        <section className="cm-main">
          <div className="cm-main-header">
            <div className="cm-main-title">
              {activeType.replace("-", " ")}
            </div>
            <div className="cm-main-actions">
              <button className="cm-button" onClick={handleCreate}>
                + New
              </button>
              <button className="cm-button" onClick={handleSave}>
                Save
              </button>
              <button className="cm-button danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>

          <div className="cm-content">
            const activeList = records[activeType] || [];

<section className="cm-list">
  {activeList.map((r) => (
    <div
      key={r.id}
      className={`cm-list-item ${r.id === selectedId ? "selected" : ""}`}
      onClick={() => {
        setSelectedId(r.id);
        setSelectedRecord(r);
      }}
    >
      {r.name || "Unnamed"}
    </div>
  ))}
</section>

            <section className="cm-detail">
              {selectedRecord ? (
                (() => {
                  const Form = getFormComponent(activeType);
                  return (
                    <Form
                      record={{
                        ...selectedRecord,
                        _campaignName:
                          campaigns.find(
                            (c) => c.id === activeCampaignId
                          )?.name,
                      }}
                      onChange={(next) => {
                        setSelectedRecord(next);
                        setSaveStatus("unsaved");
                      }}
                    />
                  );
                })()
              ) : (
                <div>Select a record.</div>
              )}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
