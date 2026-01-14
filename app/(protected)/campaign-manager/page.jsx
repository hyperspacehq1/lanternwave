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

export default function CampaignManagerPage() {
  const { campaign, session, setCampaignContext } = useCampaignContext();

  const [activeType, setActiveType] = useState("campaigns");
  const [records, setRecords] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeCampaignId = campaign?.id || null;

  // convenience: current list for activeType
  const activeList = useMemo(() => records[activeType] || [], [records, activeType]);

  /* ---------------------------------------------
     1) Load campaign list on mount (and only when activeType=campaigns)
  --------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Always ensure we have campaigns loaded at least once
      // because everything depends on having a campaign context.
      setLoading(true);
      try {
        const campaigns = await cmApi.list("campaigns");
        if (cancelled) return;

        setRecords((p) => ({ ...p, campaigns }));

        // Restore selected campaign from LS, else newest
        const storedCampaignId = localStorage.getItem(LS_CAMPAIGN);
        const storedCampaign = campaigns.find((c) => c.id === storedCampaignId);

        const chosenCampaign =
          storedCampaign ??
          [...campaigns].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ??
          null;

        if (chosenCampaign) {
          setCampaignContext({ campaign: chosenCampaign, session: null });
          localStorage.setItem(LS_CAMPAIGN, chosenCampaign.id);

          // If user is currently viewing campaigns tab, also select it in the list UI
          if (activeType === "campaigns") {
            setSelectedId(chosenCampaign.id);
            setSelectedRecord(chosenCampaign);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // NOTE: activeType included only to keep selection UI in sync
  }, [activeType, setCampaignContext]);

  /* ---------------------------------------------
     2) Restore session for the selected campaign (independent of active tab)
     - Only restores a stored session that belongs to this campaign
     - Does NOT auto-pick newest unless user visits the Sessions tab
  --------------------------------------------- */
  useEffect(() => {
    if (!campaign?.id) return;

    const storedSessionId = localStorage.getItem(LS_SESSION);
    if (!storedSessionId) return;

    // If already restored, do nothing
    if (session?.id === storedSessionId) return;

    let cancelled = false;

    (async () => {
      try {
        const sessions = await cmApi.list("sessions", { campaign_id: campaign.id });
        if (cancelled) return;

        // store list for UI if user later clicks Sessions tab
        setRecords((p) => ({ ...p, sessions }));

        const restored = sessions.find((s) => s.id === storedSessionId);

        if (restored) {
          setCampaignContext({ campaign, session: restored });

          // If user is currently viewing Sessions tab, highlight it
          if (activeType === "sessions") {
            setSelectedId(restored.id);
            setSelectedRecord(restored);
          }
        } else {
          // stale session id for this campaign
          localStorage.removeItem(LS_SESSION);
        }
      } catch {
        // silent by design
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campaign?.id, activeType, session?.id, setCampaignContext]);

  /* ---------------------------------------------
     3) Load activeType list when activeType changes (campaign-scoped types)
     - campaigns handled above
     - sessions handled here with optional "newest" auto-select
  --------------------------------------------- */
  useEffect(() => {
    if (activeType === "campaigns") return;
    if (!activeCampaignId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const list = await cmApi.list(activeType, { campaign_id: activeCampaignId });
        if (cancelled) return;

        setRecords((p) => ({ ...p, [activeType]: list }));

        // If switching tabs, clear selection if record not in list
        // (prevents stale selectedRecord when jumping between entity types)
        setSelectedId(null);
        setSelectedRecord(null);

        // Sessions tab: highlight stored session or newest (UI convenience)
        if (activeType === "sessions") {
          const storedSessionId = localStorage.getItem(LS_SESSION);
          const stored = list.find((s) => s.id === storedSessionId);

          const chosen =
            stored ??
            [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ??
            null;

          if (chosen) {
            setSelectedId(chosen.id);
            setSelectedRecord(chosen);
            setCampaignContext({ campaign, session: chosen });
            localStorage.setItem(LS_SESSION, chosen.id);
          } else {
            localStorage.removeItem(LS_SESSION);
            setCampaignContext({ campaign, session: null });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeType, activeCampaignId, campaign, setCampaignContext]);

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
      [activeType]: (p[activeType] || []).map((r) => (r.id === saved.id ? saved : r)),
    }));
    setSelectedRecord(saved);
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    await cmApi.remove(activeType, selectedRecord.id);
    setRecords((p) => ({
      ...p,
      [activeType]: (p[activeType] || []).filter((r) => r.id !== selectedRecord.id),
    }));
    setSelectedRecord(null);
    setSelectedId(null);
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
              className={`cm-container-btn ${c.id === activeType ? "active" : ""}`}
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
            <button className="cm-btn" onClick={handleSave} disabled={!selectedRecord}>
              Save / Update
            </button>
            <button className="cm-btn danger" onClick={handleDelete} disabled={!selectedRecord}>
              Delete
            </button>
          </div>

          <div className="cm-content">
            <section className="cm-list">
              {(records[activeType] || []).map((r) => (
                <div
                  key={r.id}
                  className={`cm-list-item ${r.id === selectedId ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedId(r.id);
                    setSelectedRecord(r);

                    if (activeType === "campaigns") {
                      localStorage.setItem(LS_CAMPAIGN, r.id);
                      localStorage.removeItem(LS_SESSION);
                      setCampaignContext({ campaign: r, session: null });
                    }

                    if (activeType === "sessions") {
                      localStorage.setItem(LS_SESSION, r.id);
                      setCampaignContext({ campaign, session: r });
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
                  return <Form record={selectedRecord} onChange={setSelectedRecord} />;
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
