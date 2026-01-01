"use client";

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { cmApi } from "@/lib/cm/api";
import { getFormComponent } from "@/components/forms";

import "./campaign-manager.css";

const ENTITY_RULES = {
  campaigns: {},
  sessions: { campaign: true },
  "player-characters": { campaign: true },
  npcs: { campaign: true },
  locations: { campaign: true },
  items: { campaign: true },
  events: { campaign: true },
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
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");

  /* ---------- LOAD CAMPAIGNS ---------- */
  useEffect(() => {
    cmApi.list("campaigns").then((res) => {
      setRecords((p) => ({ ...p, campaigns: res }));
      if (!activeCampaignId && res.length) setActiveCampaignId(res[0].id);
    });
  }, []);

  /* ---------- LOAD LIST BY TYPE ---------- */
  useEffect(() => {
    if (!activeType) return;

    const needsCampaign =
      ENTITY_RULES[activeType]?.campaign && !activeCampaignId;

    if (needsCampaign) return;

    let cancelled = false;

    async function load() {
      const res = await cmApi.list(
        activeType,
        activeCampaignId ? { campaign_id: activeCampaignId } : undefined
      );

      if (!cancelled) {
        setRecords((p) => ({ ...p, [activeType]: res }));
        setSelectedId(res?.[0]?.id ?? null);
        setSelectedRecord(res?.[0] ?? null);
      }
    }

    load();
    return () => (cancelled = true);
  }, [activeType, activeCampaignId]);

  /* ---------- DERIVED STATE ---------- */
  const activeSession =
    activeType === "sessions"
      ? selectedRecord
      : selectedRecord?.session_id
      ? records.sessions?.find((s) => s.id === selectedRecord.session_id)
      : null;

  /* ---------- CREATE ---------- */
  const handleCreate = () => {
    const id = uuidv4();
    const base = {
      id,
      _isNew: true,
      campaign_id: activeCampaignId,
      session_id: activeSession?.id || null,
    };

    setRecords((p) => ({
      ...p,
      [activeType]: [base, ...(p[activeType] || [])],
    }));

    setSelectedRecord(base);
    setSelectedId(id);
  };

  /* ---------- SAVE ---------- */
  const handleSave = async () => {
    if (!selectedRecord) return;

    const { _isNew, id, ...payload } = selectedRecord;

    const saved = _isNew
      ? await cmApi.create(activeType, payload)
      : await cmApi.update(activeType, id, payload);

    setRecords((prev) => {
      const list = prev[activeType] || [];
      const exists = list.find((r) => r.id === saved.id);

      return {
        ...prev,
        [activeType]: exists
          ? list.map((r) => (r.id === saved.id ? saved : r))
          : [saved, ...list],
      };
    });

    setSelectedRecord(saved);
    setSaveStatus("saved");
  };

  /* ---------- RENDER ---------- */
  return (
    <div className="cm-root">
      <div className="cm-layout">
        <aside className="cm-sidebar">
          <h1 className="cm-title">Campaign Manager</h1>
          {CONTAINER_TYPES.map((c) => (
            <button
              key={c.id}
              className={`cm-button ${c.id === activeType ? "active" : ""}`}
              onClick={() => setActiveType(c.id)}
            >
              {c.label}
            </button>
          ))}
        </aside>

        <section className="cm-main">
          <div className="cm-main-header">
            <div className="cm-main-title">{activeType}</div>
            <div className="cm-main-actions">
              <button onClick={handleCreate}>New</button>
              <button onClick={handleSave}>Save</button>
            </div>
          </div>

          <div className="cm-context-bar">
            {activeCampaignId && (
              <div>
                Campaign:{" "}
                {records.campaigns?.find((c) => c.id === activeCampaignId)?.name}
              </div>
            )}
            {activeSession && <div>Session: {activeSession.name}</div>}
          </div>

          <div className="cm-body">
            <aside className="cm-list">
              {(records[activeType] || []).map((r) => (
                <div
                  key={r.id}
                  className={`cm-list-item ${r.id === selectedId ? "active" : ""}`}
                  onClick={() => {
                    setSelectedId(r.id);
                    setSelectedRecord(r);
                  }}
                >
                  {r.name || "Unnamed"}
                </div>
              ))}
            </aside>

            <section className="cm-form">
              {selectedRecord && (
                <Form
                  record={selectedRecord}
                  campaignName={
                    records.campaigns?.find(
                      (c) => c.id === activeCampaignId
                    )?.name
                  }
                  sessionName={activeSession?.name}
                  onChange={(updated) => {
                    setSelectedRecord(updated);
                  }}
                />
              )}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
