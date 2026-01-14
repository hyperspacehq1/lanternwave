"use client";

import React, { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { cmApi } from "@/lib/cm/api";
import { getFormComponent } from "@/components/forms";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

import "./campaign-manager.css";

const LS_CAMPAIGN = "lw:selectedCampaignId";
const LS_SESSION = "lw:selectedSessionId";

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

const REQUIRES_SESSION = new Set([
  "events",
  "encounters",
  "locations",
  "npcs",
  "items",
  "players",
]);

function newestByCreatedAt(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return [...list].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )[0];
}

export default function CampaignManagerPage() {
  const { campaign, session, setCampaignContext } = useCampaignContext();

  const [activeType, setActiveType] = useState("campaigns");
  const [records, setRecords] = useState({});
  const [selectionByType, setSelectionByType] = useState({});
  const [loading, setLoading] = useState(false);

  const activeCampaignId = campaign?.id;
  const activeSessionId = session?.id;

  /* ------------------------------------------------------------
     Derived selected record (NO STATE)
  ------------------------------------------------------------ */
  const selectedRecord = useMemo(() => {
    const id = selectionByType[activeType];
    return (records[activeType] || []).find((r) => r.id === id) || null;
  }, [records, selectionByType, activeType]);

  const activeList = records[activeType] || [];

  /* ------------------------------------------------------------
     Campaigns
  ------------------------------------------------------------ */
  useEffect(() => {
    if (activeType !== "campaigns") return;

    (async () => {
      setLoading(true);
      try {
        const list = await cmApi.list("campaigns");
        setRecords((p) => ({ ...p, campaigns: list }));

        const storedId = localStorage.getItem(LS_CAMPAIGN);
        const chosen =
          list.find((c) => c.id === storedId) ??
          newestByCreatedAt(list) ??
          null;

        if (chosen) {
          setSelectionByType((p) => ({ ...p, campaigns: chosen.id }));
          setCampaignContext({ campaign: chosen, session: null });
          localStorage.setItem(LS_CAMPAIGN, chosen.id);
          localStorage.removeItem(LS_SESSION);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [activeType, setCampaignContext]);

  /* ------------------------------------------------------------
     Sessions (ensured for campaign)
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!activeCampaignId) return;

    (async () => {
      const list = await cmApi.list("sessions", {
        campaign_id: activeCampaignId,
      });
      setRecords((p) => ({ ...p, sessions: list }));

      const storedId = localStorage.getItem(LS_SESSION);
      const chosen =
        list.find((s) => s.id === storedId) ??
        newestByCreatedAt(list) ??
        null;

      if (chosen) {
        setSelectionByType((p) => ({ ...p, sessions: chosen.id }));
        setCampaignContext({ campaign, session: chosen });
        localStorage.setItem(LS_SESSION, chosen.id);
      }
    })();
  }, [activeCampaignId, campaign, setCampaignContext]);

  /* ------------------------------------------------------------
     All other entity lists
  ------------------------------------------------------------ */
  useEffect(() => {
    if (activeType === "campaigns") return;
    if (!activeCampaignId) return;
    if (REQUIRES_SESSION.has(activeType) && !activeSessionId) return;

    (async () => {
      setLoading(true);
      try {
        const params =
          activeType === "sessions"
            ? { campaign_id: activeCampaignId }
            : {
                campaign_id: activeCampaignId,
                ...(activeSessionId ? { session_id: activeSessionId } : {}),
              };

        const list = await cmApi.list(activeType, params);
        setRecords((p) => ({ ...p, [activeType]: list }));

        // ✅ Auto-select ONLY if nothing selected yet
        if (!selectionByType[activeType]) {
          const chosen = newestByCreatedAt(list);
          if (chosen) {
            setSelectionByType((p) => ({
              ...p,
              [activeType]: chosen.id,
            }));
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [
    activeType,
    activeCampaignId,
    activeSessionId,
    selectionByType,
  ]);

  /* ------------------------------------------------------------
     CRUD
  ------------------------------------------------------------ */
  const handleCreate = () => {
    const id = uuidv4();
    const base = {
      id,
      _isNew: true,
      campaign_id: activeCampaignId,
      ...(activeSessionId ? { session_id: activeSessionId } : {}),
    };

    setRecords((p) => ({
      ...p,
      [activeType]: [base, ...(p[activeType] || [])],
    }));
    setSelectionByType((p) => ({ ...p, [activeType]: id }));
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
    setSelectionByType((p) => ({ ...p, [activeType]: saved.id }));
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;

    await cmApi.remove(activeType, selectedRecord.id);

    const remaining = activeList.filter(
      (r) => r.id !== selectedRecord.id
    );
    setRecords((p) => ({ ...p, [activeType]: remaining }));

    const next = newestByCreatedAt(remaining);
    setSelectionByType((p) => ({
      ...p,
      [activeType]: next?.id || null,
    }));
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
          <div className="cm-main-actions">
            <button className="cm-btn" onClick={handleCreate}>
              + New
            </button>
            <button
              className="cm-btn"
              onClick={handleSave}
              disabled={!selectedRecord}
            >
              Save / Update
            </button>
            <button
              className="cm-btn danger"
              onClick={handleDelete}
              disabled={!selectedRecord}
            >
              Delete
            </button>
            {loading && <div className="cm-muted">Loading…</div>}
          </div>

          <div className="cm-content">
            <section className="cm-list">
              {activeList.map((r) => (
                <div
                  key={r.id}
                  className={`cm-list-item ${
                    selectionByType[activeType] === r.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectionByType((p) => ({
                      ...p,
                      [activeType]: r.id,
                    }))
                  }
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
                      onChange={(r) =>
                        setRecords((p) => ({
                          ...p,
                          [activeType]: p[activeType].map((x) =>
                            x.id === r.id ? r : x
                          ),
                        }))
                      }
                    />
                  );
                })()
              ) : (
                <div className="cm-detail-empty">Select a record.</div>
              )}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
