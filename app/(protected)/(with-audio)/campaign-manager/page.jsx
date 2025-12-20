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
  const [error, setError] = useState(null);

  const [campaigns, setCampaigns] = useState([]);
  const [activeCampaignId, setActiveCampaignId] = useState("");

  /* -----------------------------------------------------------
     Load campaigns for selector
  ------------------------------------------------------------ */
  useEffect(() => {
    cmApi
      .list("campaigns")
      .then((rows) => setCampaigns(Array.isArray(rows) ? rows : []))
      .catch(() => setCampaigns([]));
  }, []);

  /* -----------------------------------------------------------
     Load list when tab or campaign changes
  ------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        if (activeType === "sessions") {
          if (!activeCampaignId) {
            setRecords((p) => ({ ...p, sessions: [] }));
            setSelectedId(null);
            setSelectedRecord(null);
            return;
          }

          const res = await fetch(
            `/api/sessions?campaign_id=${activeCampaignId}`,
            { credentials: "include" }
          );

          const list = await res.json();

          if (!cancelled) {
            setRecords((p) => ({
              ...p,
              sessions: Array.isArray(list) ? list : [],
            }));
          }
        } else {
          const list = await cmApi.list(activeType);

          if (!cancelled) {
            setRecords((p) => ({
              ...p,
              [activeType]: Array.isArray(list) ? list : [],
            }));
          }
        }

        const current = records[activeType] || [];
        setSelectedId(current[0]?.id ?? null);
        setSelectedRecord(current[0] ?? null);
        setSaveStatus("idle");
      } catch (err) {
        console.error("Failed loading", activeType, err);
        if (!cancelled) {
          setError("Failed to load data");
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

  const activeList = records[activeType] || [];

  /* -----------------------------------------------------------
     Sync selected record
  ------------------------------------------------------------ */
  useEffect(() => {
    setSelectedRecord(
      activeList.find((r) => r.id === selectedId) || null
    );
  }, [selectedId, activeList]);

  /* -----------------------------------------------------------
     Create
  ------------------------------------------------------------ */
  const handleCreate = () => {
    const id = uuidv4();

    const base =
      activeType === "sessions"
        ? { id, _isNew: true, campaign_id: activeCampaignId }
        : { id, _isNew: true };

    setRecords((p) => ({
      ...p,
      [activeType]: [base, ...(p[activeType] || [])],
    }));

    setSelectedId(id);
    setSelectedRecord(base);
    setSaveStatus("unsaved");
  };

  /* -----------------------------------------------------------
     Save / Delete unchanged
  ------------------------------------------------------------ */
  const handleSave = async () => {
    if (!selectedRecord) return;

    try {
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

      setSelectedId(saved.id);
      setSelectedRecord(saved);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
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

          <div className="cm-container-list">
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
          </div>

          <div className="cm-save-status">Status: {saveLabel}</div>
        </aside>

        <section className="cm-main">
          <header className="cm-main-header">
            <h2>{activeType}</h2>
            <div className="cm-main-actions">
              <button
                onClick={handleCreate}
                disabled={activeType === "sessions" && !activeCampaignId}
              >
                + New
              </button>
              <button onClick={handleSave}>Save</button>
            </div>
          </header>

          {activeType === "sessions" && (
            <div style={{ marginBottom: 12 }}>
              <label>
                Campaign:&nbsp;
                <select
                  value={activeCampaignId}
                  onChange={(e) =>
                    setActiveCampaignId(e.target.value)
                  }
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
                    onClick={() => setSelectedId(r.id)}
                  >
                    {r.name || r.id}
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
