"use client";

import React, { useEffect, useState, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";

import { cmApi } from "@/lib/cm/api";
import { getFormComponent } from "@/components/forms";

import "./campaign-manager.css";

/* ------------------------------------------------------------
   Entity rules (single source of truth)
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
  const [activeSessionId, setActiveSessionId] = useState("");

  /* ------------------------------------------------------------
     Save label
  ------------------------------------------------------------ */
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

  const rules = ENTITY_RULES[activeType] || {};

  const activeCampaign = campaigns.find(
    (c) => c.id === activeCampaignId
  );

  /* ------------------------------------------------------------
     Load campaigns
  ------------------------------------------------------------ */
  useEffect(() => {
    cmApi
      .list("campaigns")
      .then((rows) => setCampaigns(Array.isArray(rows) ? rows : []))
      .catch(() => setCampaigns([]));
  }, []);

  /* ------------------------------------------------------------
     Auto-select campaign (newest on first load)
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!campaigns.length) return;

    const stored = sessionStorage.getItem("activeCampaignId");
    if (stored && campaigns.find((c) => c.id === stored)) {
      setActiveCampaignId(stored);
      return;
    }

    const newest = [...campaigns].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )[0];

    if (newest) {
      setActiveCampaignId(newest.id);
      sessionStorage.setItem("activeCampaignId", newest.id);
    }
  }, [campaigns]);

  /* ------------------------------------------------------------
     Load sessions when campaign changes
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
     HARD ASSERTION
     Non-campaign tabs require an active campaign
  ------------------------------------------------------------ */
  const campaignRequired =
    activeType !== "campaigns" && rules.campaign && !activeCampaignId;

  /* ------------------------------------------------------------
     Load records for active type
  ------------------------------------------------------------ */
  useEffect(() => {
    if (campaignRequired) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      let list = [];

      try {
        if (activeType === "sessions") {
          list = records.sessions || [];
        } else if (rules.session) {
          if (!activeSessionId) {
            list = [];
          } else {
            const res = await fetch(
              `/api/${activeType}?session_id=${activeSessionId}`,
              { credentials: "include" }
            );
            list = await res.json();
          }
        } else if (rules.campaign) {
          const res = await fetch(
            `/api/${activeType}?campaign_id=${activeCampaignId}`,
            { credentials: "include" }
          );
          list = await res.json();
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
  }, [activeType, activeCampaignId, activeSessionId]);

  const activeList = records[activeType] || [];

  /* ------------------------------------------------------------
     Create
  ------------------------------------------------------------ */
  const handleCreate = () => {
    const id = uuidv4();
    let base = { id, _isNew: true };

    if (rules.campaign) base.campaign_id = activeCampaignId;
    if (rules.session) base.session_id = activeSessionId;

    setRecords((p) => ({
      ...p,
      [activeType]: [base, ...(p[activeType] || [])],
    }));

    setSelectedId(id);
    setSelectedRecord(base);
    setSaveStatus("unsaved");
  };

  /* ------------------------------------------------------------
     Save
  ------------------------------------------------------------ */
  const handleSave = async () => {
    if (!selectedRecord) return;

    setSaveStatus("saving");

    const { _isNew, id, ...payload } = selectedRecord;

    if (rules.campaign) payload.campaign_id = activeCampaignId;
    if (rules.session) payload.session_id = activeSessionId;

    const saved = _isNew
      ? await cmApi.create(activeType, payload)
      : await cmApi.update(activeType, id, payload);

    setRecords((p) => {
      const list = p[activeType] || [];
      const next = _isNew
        ? [saved, ...list.filter((r) => r.id !== id)]
        : list.map((r) => (r.id === saved.id ? saved : r));

      return { ...p, [activeType]: next };
    });

    setSelectedId(saved.id);
    setSelectedRecord(saved);
    setSaveStatus("saved");
  };

  /* ------------------------------------------------------------
     Delete (soft)
  ------------------------------------------------------------ */
  const handleDelete = async () => {
    if (!selectedRecord || selectedRecord._isNew) return;

    const confirmed = window.confirm("Confirm Delete? Yes or No.");
    if (!confirmed) return;

    await cmApi.delete(activeType, selectedRecord.id);

    setRecords((p) => ({
      ...p,
      [activeType]: (p[activeType] || []).filter(
        (r) => r.id !== selectedRecord.id
      ),
    }));

    setSelectedId(null);
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

          <div className="cm-save-status">Status: {saveLabel}</div>
        </aside>

        <section className="cm-main">
          <header className="cm-main-header">
            <h2>{activeType}</h2>
            <div>
              <button
                onClick={handleCreate}
                disabled={
                  (rules.campaign && !activeCampaignId) ||
                  (rules.session && !activeSessionId)
                }
              >
                + New
              </button>
              <button onClick={handleSave}>Save</button>
              <button
                onClick={handleDelete}
                disabled={!selectedRecord || selectedRecord._isNew}
                style={{ marginLeft: 8 }}
              >
                Delete
              </button>
            </div>
          </header>

          {/* Campaign selector ONLY on Campaigns tab */}
          {activeType === "campaigns" && (
            <div style={{ marginBottom: 12 }}>
              <label>
                Campaign:&nbsp;
                <select
                  value={activeCampaignId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setActiveCampaignId(id);
                    setActiveSessionId("");
                    sessionStorage.setItem("activeCampaignId", id);
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

          {/* Session selector (Events only) */}
          {rules.session && (
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

          {/* HARD ASSERTION UI */}
          {campaignRequired ? (
            <div className="cm-empty-state">
              <strong>Select a Campaign</strong>
              <p>
                You must select a campaign before working with{" "}
                {activeType}.
              </p>
            </div>
          ) : (
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
                      {(
                        r.name ??
                        [r.firstName, r.lastName]
                          .filter(Boolean)
                          .join(" ")
                      ) || "Unnamed"}
                    </div>
                  ))}
              </section>

              <section className="cm-detail">
                {selectedRecord ? (
                  (() => {
                    const Form = getFormComponent(activeType);
                    return Form ? (
                      <Form
                        record={{
                          ...selectedRecord,
                          _type: activeType,
                          _campaignName: activeCampaign?.name,
                        }}
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
          )}
        </section>
      </div>
    </div>
  );
}
