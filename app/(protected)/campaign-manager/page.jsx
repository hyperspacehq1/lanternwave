"use client";

import React, { useEffect, useState } from "react";
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

export default function CampaignManagerPage() {
  const { campaign, session, setCampaignContext } = useCampaignContext();

  const [activeType, setActiveType] = useState("campaigns");
  const [records, setRecords] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeCampaignId = campaign?.id;

  /* ---------------------------------------------
     Load lists
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

        if (cancelled) return;

        setRecords((p) => ({ ...p, [activeType]: list }));

        // ---- CAMPAIGN AUTO-SELECT ----
        if (activeType === "campaigns") {
          const storedId = localStorage.getItem(LS_CAMPAIGN);
          const stored = list.find((c) => c.id === storedId);

          const chosen =
            stored ??
            [...list].sort(
              (a, b) => new Date(b.created_at) - new Date(a.created_at)
            )[0] ??
            null;

          if (chosen) {
            setSelectedId(chosen.id);
            setSelectedRecord(chosen);
            setCampaignContext({ campaign: chosen, session: null });
            localStorage.setItem(LS_CAMPAIGN, chosen.id);
          }
        }

        // ---- SESSION AUTO-SELECT ----
        if (activeType === "sessions") {
          const storedSessionId = localStorage.getItem(LS_SESSION);
          const storedSession = list.find(
            (s) => s.id === storedSessionId
          );

          const chosen =
            storedSession ??
            [...list].sort(
              (a, b) => new Date(b.created_at) - new Date(a.created_at)
            )[0] ??
            null;

          if (chosen) {
            setSelectedId(chosen.id);
            setSelectedRecord(chosen);
            setCampaignContext({ campaign, session: chosen });
            localStorage.setItem(LS_SESSION, chosen.id);
          } else {
            localStorage.removeItem(LS_SESSION);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeType, activeCampaignId]);

  /* ---------------------------------------------
     CRUD
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

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */
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
                      localStorage.setItem(LS_CAMPAIGN, r.id);
                      localStorage.removeItem(LS_SESSION);
                      setCampaignContext({
                        campaign: r,
                        session: null,
                      });
                    }

                    if (activeType === "sessions") {
                      localStorage.setItem(LS_SESSION, r.id);
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
                      onChange={setSelectedRecord}
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
