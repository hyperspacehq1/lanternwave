"use client";

import React, { useEffect, useState, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";

import { cmApi } from "@/lib/cm/api";
import { getFormComponent } from "@/components/forms";

import "./campaign-manager.css";

/* ------------------------------------------------------------
   Helpers – persist session per campaign
------------------------------------------------------------ */
const getStoredSession = (campaignId) =>
  localStorage.getItem(`cm:lastSession:${campaignId}`);

const setStoredSession = (campaignId, sessionId) =>
  localStorage.setItem(`cm:lastSession:${campaignId}`, sessionId);

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

  const [searchTerm, setSearchTerm] = useState("");

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
    cmApi.list("campaigns").then(setCampaigns).catch(() => setCampaigns([]));
  }, []);

  /* ------------------------------------------------------------
     Auto-select first campaign
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!campaigns.length || activeCampaignId) return;
    setActiveCampaignId(campaigns[0].id);
  }, [campaigns, activeCampaignId]);

  const campaignRequired =
    activeType !== "campaigns" && !activeCampaignId;

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
        if (activeType === "campaigns") {
          list = await cmApi.list("campaigns");
        } else {
          const res = await fetch(
            `/api/${activeType}?campaign_id=${activeCampaignId}`
          );
          list = await res.json();
        }

        if (!cancelled) {
          setRecords((p) => ({ ...p, [activeType]: list || [] }));

          let selected =
            activeType === "sessions"
              ? list.find((r) => r.id === getStoredSession(activeCampaignId)) ||
                list[0]
              : list[0];

          setSelectedId(selected?.id || null);
          setSelectedRecord(selected || null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeType, activeCampaignId]);

  const handleCreate = () => {
    if (loading) return;

    if (activeType !== "campaigns" && !activeCampaignId) {
      alert("Create a campaign first.");
      return;
    }

    const id = uuidv4();

    const base = {
      id,
      _isNew: true,
      campaign_id: activeCampaignId,
      session_id: activeType === "sessions" ? null : undefined,
    };

    setRecords((p) => ({
      ...p,
      [activeType]: [base, ...(p[activeType] || [])],
    }));

    setSelectedId(id);
    setSelectedRecord(base);
  };

  const handleSave = async () => {
    if (!selectedRecord || loading) return;

    setSaveStatus("saving");

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

    if (activeType === "sessions") {
      setStoredSession(activeCampaignId, saved.id);
    }

    setSelectedRecord(saved);
    setSaveStatus("saved");
  };

  const handleDelete = async () => {
    if (!selectedRecord?.id || loading) return;

    await cmApi.remove(activeType, selectedRecord.id);

    setRecords((p) => ({
      ...p,
      [activeType]: p[activeType].filter(
        (r) => r.id !== selectedRecord.id
      ),
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
              disabled={loading}
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
          {/* HEADER */}
          <div className="cm-main-header">
            <div className="cm-main-title">
              Campaign:{" "}
              {campaigns.find((c) => c.id === activeCampaignId)?.name ||
                "—"}
              {selectedRecord?.name && (
                <> | Session: {selectedRecord.name}</>
              )}
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

          {loading && (
            <div className="cm-loading-indicator">Loading…</div>
          )}

          {!campaignRequired && (
            <div className="cm-content">
              <section className="cm-list">
                {records[activeType]?.map((r) => (
                  <div
                    key={r.id}
                    className={`cm-list-item ${
                      r.id === selectedId ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedId(r.id);
                      setSelectedRecord(r);
                      if (activeType === "sessions") {
                        setStoredSession(activeCampaignId, r.id);
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
                  <div className="cm-empty-state">
                    Select or create an item.
                  </div>
                )}
              </section>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
