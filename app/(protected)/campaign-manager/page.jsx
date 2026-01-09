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
  events: { campaign: true },
  encounters: { campaign: true },
  locations: { campaign: true },
  npcs: { campaign: true },
  items: { campaign: true },
  players: { campaign: true },
};

const CONTAINER_TYPES = [
  { id: "campaigns", label: "Campaigns" },
  { id: "sessions", label: "Sessions" },
  { id: "events", label: "Events" },
  { id: "encounters", label: "Encounters" },
  { id: "locations", label: "Locations" },
  { id: "npcs", label: "NPCs" },
  { id: "items", label: "Items" },
  { id: "players", label: "Players" },
];

export default function CampaignManagerPage() {
  const { campaign, session, setCampaignContext } = useCampaignContext();

  const [activeType, setActiveType] = useState("campaigns");
  const [records, setRecords] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [loading, setLoading] = useState(false);

  const activeCampaignId = campaign?.id;

  /* ---------------------------------------------
     Load data
  --------------------------------------------- */
  useEffect(() => {
    if (activeType !== "campaigns" && !activeCampaignId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const list =
          activeType === "campaigns"
            ? await cmApi.list("campaigns")
            : await cmApi.list(activeType, { campaign_id: activeCampaignId });

        if (!cancelled) {
          setRecords((p) => ({ ...p, [activeType]: list }));

         const first = [...list]
  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ?? null;

// 🔒 Do NOT overwrite existing selection
if (!selectedId && first) {
  setSelectedId(first.id);
  setSelectedRecord(first);

  if (activeType === "campaigns" && !campaign) {
    setCampaignContext({ campaign: first, session: null });
  }

  if (activeType === "sessions" && !session) {
    setCampaignContext({ campaign, session: first });
  }
}

          if (activeType === "campaigns" && list?.length) {
            setCampaignContext({ campaign: list[0], session: null });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeType]);

  /* ---------------------------------------------
     CRUD Actions
  --------------------------------------------- */
  const handleCreate = () => {
    const id = uuidv4();
    const base = { id, _isNew: true, campaign_id: campaign?.id };

    setSelectedId(id);
    setSelectedRecord(base);
    setRecords((p) => ({
      ...p,
      [activeType]: [base, ...(p[activeType] || [])],
    }));
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
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    await cmApi.remove(activeType, selectedRecord.id);
    setRecords((p) => ({
      ...p,
      [activeType]: p[activeType].filter(
        (r) => r.id !== selectedRecord.id
      ),
    }));
    setSelectedRecord(null);
  };

  /* ------------------------------------------------------------
     RENDER
  ------------------------------------------------------------ */
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
        </aside>

        <section className="cm-main">
          <div className="cm-main-header">
            <div className="cm-main-title">{activeType}</div>
          </div>

          <div className="cm-main-actions">
            <button
              className="cm-btn"
              onClick={handleCreate}
              disabled={loading}
            >
              + New
            </button>

            <button
              className="cm-btn"
              onClick={handleSave}
              disabled={!selectedRecord || loading}
            >
              Save
            </button>

            <button
              className="cm-btn danger"
              onClick={handleDelete}
              disabled={!selectedRecord || loading}
            >
              Delete
            </button>
          </div>

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

                    if (activeType === "campaigns") {
                      setCampaignContext({
                        campaign: r,
                        session: null,
                      });
                    }

                    if (activeType === "sessions") {
                      setCampaignContext({
                        campaign,
                        session: r,
                      });
                    }
                  }}
                >
                  {activeType === "players"
                    ? `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim()
                    : r.name}
                </div>
              ))}
            </section>

            <section className="cm-detail">
              {selectedRecord ? (
                (() => {
                  const Form = getFormComponent(activeType);
                  return (
                    <Form
                      record={selectedRecord}
                      onChange={(next) =>
                        setSelectedRecord(next)
                      }
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
