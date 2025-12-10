"use client";

import React, { useEffect, useState, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";

// Service layer API
import { cmApi, getAdminKey, setAdminKey } from "@/lib/cm/client";

// Specialized form registry
import { getFormComponent } from "@/components/forms";
import Timeline from "@/components/gm/Timeline";

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
  const [adminKeyInput, setAdminKeyInput] = useState("");

  // Load admin API key on mount
  useEffect(() => {
    setAdminKeyInput(getAdminKey());
  }, []);

  // Load records whenever active type changes
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const list = await cmApi.list(activeType);
        setRecords((prev) => ({ ...prev, [activeType]: list }));

        if (list.length > 0) {
          setSelectedId(list[0].id);
          setSelectedRecord(list[0]);
        } else {
          setSelectedId(null);
          setSelectedRecord(null);
        }
      } catch (err) {
        console.error("Failed loading", activeType, err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [activeType]);

  const activeList = records[activeType] || [];

  // Sync selectedRecord when selectedId changes
  useEffect(() => {
    const rec =
      activeList.find((r) => r.id === selectedId) || null;
    setSelectedRecord(rec);
  }, [selectedId, activeList]);

  // Save admin key
  const handleAdminKeySave = () => {
    setAdminKey(adminKeyInput || "");
  };

  // Create new record
  const handleCreate = () => {
    const id = uuidv4();
    const base = { id, _isNew: true };

    setRecords((prev) => {
      const list = prev[activeType] || [];
      return { ...prev, [activeType]: [base, ...list] };
    });

    setSelectedId(id);
    setSelectedRecord(base);
    setSaveStatus("unsaved");
  };

  // Delete record
  const handleDelete = async () => {
    if (!selectedRecord || !selectedRecord.id) return;

    // Local-only record
    if (selectedRecord._isNew) {
      setRecords((prev) => {
        const list = (prev[activeType] || []).filter(
          (r) => r.id !== selectedRecord.id
        );
        return { ...prev, [activeType]: list };
      });
      setSelectedId(null);
      setSelectedRecord(null);
      setSaveStatus("idle");
      return;
    }

    try {
      setSaveStatus("saving");
      await cmApi.remove(activeType, selectedRecord.id);

      setRecords((prev) => {
        const list = (prev[activeType] || []).filter(
          (r) => r.id !== selectedRecord.id
        );
        return { ...prev, [activeType]: list };
      });

      setSelectedId(null);
      setSelectedRecord(null);
      setSaveStatus("saved");
    } catch (err) {
      console.error("Delete failed:", err);
      setSaveStatus("error");
    }
  };

  // Save record (create/update)
  const handleSave = async () => {
    if (!selectedRecord) return;

    try {
      setSaveStatus("saving");

      let saved;

      if (selectedRecord._isNew) {
        const { _isNew, id, ...rest } = selectedRecord;
        saved = await cmApi.create(activeType, rest);
      } else {
        const { _isNew, ...rest } = selectedRecord;
        saved = await cmApi.update(activeType, selectedRecord.id, rest);
      }

      // Update local store
      setRecords((prev) => {
        let list = prev[activeType] || [];
        list = list.map((r) =>
          r.id === selectedRecord.id ? saved : r
        );

        if (!list.find((r) => r.id === saved.id)) {
          list.unshift(saved);
        }

        return { ...prev, [activeType]: list };
      });

      setSelectedId(saved.id);
      setSelectedRecord(saved);
      setSaveStatus("saved");
    } catch (err) {
      console.error("Save failed:", err);
      setSaveStatus("error");
    }
  };

  const saveLabel = useMemo(() => {
    switch (saveStatus) {
      case "unsaved":
        return "Unsaved Changes";
      case "saving":
        return "Saving…";
      case "saved":
        return "Saved";
      case "error":
        return "Save Error";
      default:
        return "Idle";
    }
  }, [saveStatus]);

  return (
    <div className="cm-root">

      {/* ============================================================
          GLOBAL LANTERNWAVE HEADER (same as Controller)
      ============================================================ */}
      <header className="lw-header">
        <div className="lw-header-left">
          <div className="lw-logo-wrap">
            <img src="/lanternwave-logo.png" className="lw-logo" alt="logo" />
          </div>
          <div className="lw-title-block">
            <h1 className="lw-app-title">LANTERNWAVE</h1>
            <p className="lw-app-subtitle">Campaign Manager</p>
          </div>
        </div>

        <nav className="lw-nav">
          <a href="/controller" className="lw-nav-link">
            Controller
          </a>
          <a href="/player" className="lw-nav-link">
            Player View
          </a>
          <a href="/campaign-manager" className="lw-nav-link lw-nav-link-active">
            Campaign Manager
          </a>
        </nav>
      </header>

      {/* ============================================================
          ORIGINAL CAMPAIGN MANAGER LAYOUT
      ============================================================ */}
      <div className="cm-layout">

        {/* SIDEBAR */}
        <aside className="cm-sidebar">
          <h1 className="cm-title">Campaign Manager</h1>

          <div className="cm-admin-key">
            <label>Admin API Key</label>
            <input
              type="password"
              value={adminKeyInput}
              onChange={(e) => setAdminKeyInput(e.target.value)}
            />
            <button className="cm-button" onClick={handleAdminKeySave}>
              Save Key
            </button>
          </div>

          <div className="cm-container-list">
            {CONTAINER_TYPES.map((c) => (
              <button
                key={c.id}
                className={
                  c.id === activeType
                    ? "cm-container-btn active"
                    : "cm-container-btn"
                }
                onClick={() => setActiveType(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="cm-save-status">Status: {saveLabel}</div>
        </aside>

        {/* MAIN PANEL */}
        <main className="cm-main">
          <header className="cm-main-header">
            <h2 className="cm-main-title">
              {CONTAINER_TYPES.find((t) => t.id === activeType)?.label}
            </h2>
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
          </header>

          <div className="cm-content">
            {/* LIST */}
            <section className="cm-list">
              {loading && <div className="cm-list-status">Loading…</div>}

              {!loading &&
                activeList.map((record) => (
                  <div
                    key={record.id}
                    className={
                      record.id === selectedId
                        ? "cm-list-item selected"
                        : "cm-list-item"
                    }
                    onClick={() => setSelectedId(record.id)}
                  >
                    <div className="cm-list-label">
                      {record.name ||
                        record.title ||
                        record.description?.slice(0, 60) ||
                        record.id}
                    </div>
                  </div>
                ))}

              {!loading && activeList.length === 0 && (
                <div className="cm-list-empty">No records yet.</div>
              )}
            </section>

            {/* DETAIL PANEL */}
            <section className="cm-detail">
              {selectedRecord ? (
                (() => {
                  const FormComponent = getFormComponent(activeType);

                  return (
                    <FormComponent
                      record={{ ...selectedRecord, _type: activeType }}
                      onChange={(updated) => {
                        setSelectedRecord(updated);
                        setRecords((prev) => {
                          const list = (prev[activeType] || []).map((r) =>
                            r.id === updated.id ? updated : r
                          );
                          return { ...prev, [activeType]: list };
                        });
                        setSaveStatus("unsaved");
                      }}
                    />
                  );
                })()
              ) : (
                <div className="cm-detail-empty">
                  Select or create a record.
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
