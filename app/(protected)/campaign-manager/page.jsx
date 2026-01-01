"use client";

import React, { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { cmApi } from "@/lib/cm/api";
import { getFormComponent } from "@/components/forms";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

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
  const { campaign, session, setCampaignContext } = useCampaignContext();

  const [activeType, setActiveType] = useState("campaigns");
  const [records, setRecords] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const activeCampaignId = campaign?.id;

  const saveLabel = useMemo(
    () =>
      ({
        unsaved: "Unsaved Changes",
        saving: "Saving…",
        saved: "Saved",
        idle: "Idle",
      }[saveStatus]),
    [saveStatus]
  );

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

      try {
        let list = [];

        if (rules.campaign) {
          const res = await fetch(
            `/api/${activeType}?campaign_id=${activeCampaignId}`
          );
          list = await res.json();
        } else {
          list = await cmApi.list(activeType);
        }

        if (!cancelled) {
          setRecords((p) => ({ ...p, [activeType]: list }));
          setSelectedId(list?.[0]?.id ?? null);
          setSelectedRecord(list?.[0] ?? null);
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

  /* ------------------------------------------------------------
     CRUD Actions
  ------------------------------------------------------------ */
  const handleCreate = () => {
    if (loading) return;

    const id = uuidv4();
    const base = {
      id,
      _isNew: true,
      campaign_id: activeCampaignId,
    };

    setRecords((p) => ({
      ...p,
      [activeType]: [base, ...(p[activeType] || [])],
    }));

    setSelectedId(id);
    setSelectedRecord(base);
    setSaveStatus("unsaved");
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

    setSelectedRecord(saved);
    setSaveStatus("saved");
  };

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

  /* ------------------------------------------------------------
     Render
  ------------------------------------------------------------ */
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
          {/* Header */}
          <div className="cm-main-header">
            <div className="cm-main-title">
              {activeType.replace("-", " ")}
            </div>

            <div className="cm-main-actions">
              <button onClick={handleCreate} disabled={loading}>
                + New
              </button>
              <button onClick={handleSave} disabled={loading}>
                Save
              </button>
              <button
                className="danger"
                onClick={handleDelete}
                disabled={loading}
              >
                Delete
              </button>
            </div>
          </div>

          {/* Context bar */}
          <div className="cm-context-bar">
            {campaign && (
              <div>
                <strong>Campaign:</strong> {campaign.name}
              </div>
            )}
            {session && (
              <div>
                <strong>Session:</strong> {session.name}
              </div>
            )}
          </div>

          {/* Content */}
          {campaignRequired ? (
            <div className="cm-detail-empty">
              Select a campaign to continue.
            </div>
          ) : (
            <div className="cm-content">
              <section className="cm-list">
                {(records[activeType] || []).map((r) => (
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
                          _campaignName: campaign?.name,
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
