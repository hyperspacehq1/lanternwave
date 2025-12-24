"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  const [activeCampaignId, setActiveCampaignId] = useState("");

  const saveLabel = useMemo(
    () =>
      ({
        unsaved: "Unsaved Changes",
        saving: "Saving…",
        saved: "Saved",
        error: "Save Error",
        idle: "Idle",
      }[saveStatus]),
    [saveStatus]
  );

  /* ------------------------------------------------------------
     Load campaigns
  ------------------------------------------------------------ */
  useEffect(() => {
    cmApi
      .list("campaigns")
      .then(setCampaigns)
      .catch(() => setCampaigns([]));
  }, []);

  /* ------------------------------------------------------------
     Auto-select first campaign if none selected
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!campaigns.length) return;
    if (activeCampaignId) return;

    setActiveCampaignId(campaigns[0].id);
  }, [campaigns, activeCampaignId]);

  const rules = ENTITY_RULES[activeType] || {};
  const campaignRequired =
    activeType !== "campaigns" && rules.campaign && !activeCampaignId;

  /* ------------------------------------------------------------
     Load records
  ------------------------------------------------------------ */
  useEffect(() => {
    if (campaignRequired) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      let list = [];

      try {
        if (rules.campaign) {
          const res = await fetch(
            `/api/${activeType}?campaign_id=${activeCampaignId}`
          );
          list = await res.json();
        } else {
          list = await cmApi.list(activeType);
        }

        if (!cancelled) {
          setRecords((p) => ({ ...p, [activeType]: list || [] }));
          setSelectedId(list?.[0]?.id ?? null);
          setSelectedRecord(list?.[0] ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => (cancelled = true);
  }, [activeType, activeCampaignId]);

  const activeList = records[activeType] || [];

  /* ------------------------------------------------------------
     Actions
  ------------------------------------------------------------ */
  const handleCreate = () => {
    const id = uuidv4();
    const base = { id, _isNew: true, campaign_id: activeCampaignId };

    setRecords((p) => ({
      ...p,
      [activeType]: [base, ...(p[activeType] || [])],
    }));

    setSelectedId(id);
    setSelectedRecord(base);
    setSaveStatus("unsaved");
  };

  const handleSave = async () => {
    if (!selectedRecord) return;

    const { _isNew, id, ...payload } = selectedRecord;
    const saved = _isNew
      ? await cmApi.create(activeType, payload)
      : await cmApi.update(activeType, id, payload);

    setRecords((p) => ({
      ...p,
      [activeType]: p[activeType].map((r) =>
        r.id === saved.id ? saved : r
      ),
    }));

    setSelectedRecord(saved);
    setSaveStatus("saved");
  };

  const handleDelete = async () => {
    if (!selectedRecord?.id) return;

    await cmApi.remove(activeType, selectedRecord.id);

    setRecords((p) => ({
      ...p,
      [activeType]: p[activeType].filter(
        (r) => r.id !== selectedRecord.id
      ),
    }));

    setSelectedRecord(null);
    setSelectedId(null);
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

          <div className="cm-save-status">Status: {saveLabel}</div>
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
              <button
                className="cm-button danger"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>

          {campaignRequired ? (
            <div className="cm-detail-empty">
              Select a campaign to continue.
            </div>
          ) : (
            <div className="cm-content">
              <section className="cm-list">
                {activeList.map((r) => (
                  <div
                    key={r.id}
                    className={`cm-list-item ${
                      r.id === selectedId ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedId(r.id);
                      setSelectedRecord(r);

                      // 🔑 CRITICAL FIX
                      if (activeType === "campaigns") {
                        setActiveCampaignId(r.id);
                      }
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
          )}
        </section>
      </div>
    </div>
  );
}
