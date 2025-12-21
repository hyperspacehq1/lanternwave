"use client";

import React, { useEffect, useState, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";

import { cmApi } from "@/lib/cm/api";
import { getFormComponent } from "@/components/forms";

import "./campaign-manager.css";

const CONTAINER_TYPES = [
  { id: "campaigns", label: "Campaigns" },
  { id: "sessions", label: "Sessions" },
  { id: "events", label: "Events" },
  { id: "playerCharacters", label: "Player Characters" },
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
  const [activeSessionId, setActiveSessionId] = useState("");

  /* ------------------------------------------------------------
     Load campaigns once
  ------------------------------------------------------------ */
  useEffect(() => {
    cmApi
      .list("campaigns")
      .then((rows) => setCampaigns(Array.isArray(rows) ? rows : []))
      .catch(() => setCampaigns([]));
  }, []);

  /* ------------------------------------------------------------
     Load sessions when campaign changes
     (needed for Sessions, Events, Encounters)
  ------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      if (!activeCampaignId) {
        setRecords((p) => ({ ...p, sessions: [] }));
        setActiveSessionId("");
        return;
      }

      try {
        const res = await fetch(
          `/api/sessions?campaign_id=${activeCampaignId}`,
          { credentials: "include" }
        );
        const rows = await res.json();

        if (!cancelled) {
          setRecords((p) => ({
            ...p,
            sessions: Array.isArray(rows) ? rows : [],
          }));
        }
      } catch {
        if (!cancelled) {
          setRecords((p) => ({ ...p, sessions: [] }));
        }
      }
    }

    loadSessions();
    return () => {
      cancelled = true;
    };
  }, [activeCampaignId]);

  /* ------------------------------------------------------------
     Load records for active type
  ------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      let list = [];

      try {
        if (activeType === "sessions") {
          list = records.sessions || [];
        } else if (activeType === "events" || activeType === "encounters") {
          if (!activeSessionId) {
            list = [];
          } else {
            const res = await fetch(
              `/api/${activeType}?session_id=${activeSessionId}`,
              { credentials: "include" }
            );
            list = await res.json();
          }
        } else {
          list = await cmApi.list(activeType);
        }

        if (cancelled) return;

        const safe = Array.isArray(list) ? list : [];
        setRecords((p) => ({ ...p, [activeType]: safe }));
        setSelectedId(safe[0]?.id ?? null);
        setSelectedRecord(safe[0] ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeType, activeSessionId]);

  const activeList = records[activeType] || [];

  /* ------------------------------------------------------------
     Create new record
  ------------------------------------------------------------ */
  const handleCreate = () => {
    const id = uuidv4();
    let base = { id, _isNew: true };

    if (activeType === "sessions") {
      base.campaign_id = activeCampaignId;
    }

    if (activeType === "events" || activeType === "encounters") {
      base.campaign_id = activeCampaignId;
      base.session_id = activeSessionId;
    }

    setRecords((p) => ({
      ...p,
      [activeType]: [base, ...(p[activeType] || [])],
    }));

    setSelectedId(id);
    setSelectedRecord(base);
    setSaveStatus("unsaved");
  };

  /* ------------------------------------------------------------
     Save record
  ------------------------------------------------------------ */
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

    setSelectedId(saved.id);
    setSelectedRecord(saved);
    setSaveStatus("saved");
  };

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
          <header className="cm-main-header">
            <h2>{activeType}</h2>
            <div>
              <button
                onClick={handleCreate}
                disabled={
                  (activeType === "sessions" && !activeCampaignId) ||
                  ((activeType === "events" ||
                    activeType === "encounters") &&
                    !activeSessionId)
                }
              >
                + New
              </button>
              <button onClick={handleSave}>Save</button>
            </div>
          </header>

          {(activeType === "sessions" ||
            activeType === "events" ||
            activeType === "encounters") && (
            <div style={{ marginBottom: 12 }}>
              <label>
                Campaign:&nbsp;
                <select
                  value={activeCampaignId}
                  onChange={(e) => {
                    setActiveCampaignId(e.target.value);
                    setActiveSessionId("");
                  }}
                >
                  <option value="">Select campaign…</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {(activeType === "events" || activeType === "encounters") && (
            <div style={{ marginBottom: 12 }}>
              <label>
                Session:&nbsp;
                <select
                  value={activeSessionId}
                  onChange={(e) => setActiveSessionId(e.target.value)}
                  disabled={!activeCampaignId}
                >
                  <option value="">Select session…</option>
                  {(records.sessions || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="cm-content">
            <section className="cm-list">
              {loading && <div>Loading…</div>}
              {!loading &&
                activeList.map((r) => (
                  <div
                    key={r.id}
                    className={`cm-list-item ${
                      r.id === selectedId ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedId(r.id);
                      setSelectedRecord(r);
                    }}
                  >
                    {r.name}
                  </div>
                ))}
            </section>

            <section className="cm-detail">
              {selectedRecord ? (
                (() => {
                  const Form = getFormComponent(activeType);
                  return Form ? (
                    <Form
                      record={{ ...selectedRecord, _type: activeType }}
                      onChange={(next) => {
                        setSelectedRecord(next);
                        setSaveStatus("unsaved");
                      }}
                    />
                  ) : (
                    <div>No form implemented.</div>
                  );
                })()
              ) : (
                <div>Select or create a record.</div>
              )}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
