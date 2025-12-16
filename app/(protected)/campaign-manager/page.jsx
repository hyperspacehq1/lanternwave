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
  { id: "quests", label: "Quests" },
  { id: "locations", label: "Locations" },
  { id: "items", label: "Items" },
  { id: "lore", label: "Lore" },
  { id: "logs", label: "Logs" },
];

export default function CampaignManagerPage() {
  const [activeType, setActiveType] = useState("campaigns");
  const [records, setRecords] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const list = await cmApi.list(activeType);
        setRecords((prev) => ({ ...prev, [activeType]: list }));
        setSelectedId(list[0]?.id || null);
        setSelectedRecord(list[0] || null);
      } catch (err) {
        console.error("Failed loading", activeType, err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeType]);

  const activeList = records[activeType] || [];

  useEffect(() => {
    setSelectedRecord(activeList.find((r) => r.id === selectedId) || null);
  }, [selectedId, activeList]);

  const handleCreate = () => {
    const id = uuidv4();
    const base = { id, _isNew: true };
    setRecords((p) => ({
      ...p,
      [activeType]: [base, ...(p[activeType] || [])],
    }));
    setSelectedId(id);
    setSelectedRecord(base);
    setSaveStatus("unsaved");
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;

    if (selectedRecord._isNew) {
      setRecords((p) => ({
        ...p,
        [activeType]: p[activeType].filter((r) => r.id !== selectedRecord.id),
      }));
      setSelectedId(null);
      setSelectedRecord(null);
      setSaveStatus("idle");
      return;
    }

    try {
      setSaveStatus("saving");
      await cmApi.remove(activeType, selectedRecord.id);
      setRecords((p) => ({
        ...p,
        [activeType]: p[activeType].filter((r) => r.id !== selectedRecord.id),
      }));
      setSelectedId(null);
      setSelectedRecord(null);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  const handleSave = async () => {
    if (!selectedRecord) return;
    try {
      setSaveStatus("saving");
      const { _isNew, id, ...rest } = selectedRecord;
      const saved = _isNew
        ? await cmApi.create(activeType, rest)
        : await cmApi.update(activeType, id, rest);

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
    <div className="lw-root">
      {/* Header now matches Controller + GM */}
      <Header />

      <main className="lw-main">
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
              <div className="cm-save-status">
                Status: {saveLabel}
              </div>
            </aside>

            <main className="cm-main">
              <header className="cm-main-header">
                <h2 className="cm-main-title">
                  {
                    CONTAINER_TYPES.find(
                      (t) => t.id === activeType
                    )?.label
                  }
                </h2>
                <div className="cm-main-actions">
                  <button onClick={handleCreate}>+ New</button>
                  <button onClick={handleSave}>Save</button>
                  <button className="danger" onClick={handleDelete}>
                    Delete
                  </button>
                </div>
              </header>

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
                        {r.name || r.title || r.id}
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
                            _type: activeType,
                          }}
                          onChange={(u) => {
                            setSelectedRecord(u);
                            setSaveStatus("unsaved");
                          }}
                        />
                      );
                    })()
                  ) : (
                    <div>Select or create a record.</div>
                  )}
                </section>
              </div>
            </main>
          </div>
        </div>
      </main>
    </div>
  );
}
