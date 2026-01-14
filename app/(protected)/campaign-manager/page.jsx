"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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

// Types that require a session to be meaningful in forms
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
  // created_at is expected; if missing, fallback to stable-ish sort by id
  const sorted = [...list].sort((a, b) => {
    const ad = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const bd = b?.created_at ? new Date(b.created_at).getTime() : 0;
    if (bd !== ad) return bd - ad;
    return String(b?.id || "").localeCompare(String(a?.id || ""));
  });
  return sorted[0] ?? null;
}

export default function CampaignManagerPage() {
  const { campaign, session, setCampaignContext } = useCampaignContext();

  const [activeType, setActiveType] = useState("campaigns");
  const [records, setRecords] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeCampaignId = campaign?.id;
  const activeSessionId = session?.id;

  // Helps avoid re-running session auto-select multiple times for same campaign load
  const ensuredSessionForCampaignRef = useRef(null);

  // Convenience: current list for active tab
  const activeList = useMemo(() => records?.[activeType] || [], [records, activeType]);

  /* ------------------------------------------------------------
     1) Load campaigns list on mount / when activeType is campaigns
        and auto-select newest (or stored) campaign
  ------------------------------------------------------------ */
  useEffect(() => {
    if (activeType !== "campaigns") return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const list = await cmApi.list("campaigns");
        if (cancelled) return;

        setRecords((p) => ({ ...p, campaigns: list }));

        const storedId = localStorage.getItem(LS_CAMPAIGN);
        const stored = Array.isArray(list) ? list.find((c) => c.id === storedId) : null;

        const chosen = stored ?? newestByCreatedAt(list) ?? null;

        if (chosen) {
          setSelectedId(chosen.id);
          setSelectedRecord(chosen);

          // Important: set campaign immediately; session will be ensured by the next effect
          setCampaignContext({ campaign: chosen, session: null });

          localStorage.setItem(LS_CAMPAIGN, chosen.id);
        } else {
          // Rule #1: no campaigns => do nothing
          localStorage.removeItem(LS_CAMPAIGN);
          localStorage.removeItem(LS_SESSION);
          setSelectedId(null);
          setSelectedRecord(null);
          setCampaignContext({ campaign: null, session: null });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeType, setCampaignContext]);

  /* ------------------------------------------------------------
     2) Ensure a session is selected whenever a campaign is selected
        (even if user never clicks Sessions tab)

     This is the critical fix that prevents:
       - "No Session Selected"
       - "Select a session" flicker
       - Non-session tabs forgetting after reload
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!activeCampaignId) return;

    // Avoid re-ensuring for same campaign repeatedly
    if (ensuredSessionForCampaignRef.current === activeCampaignId && activeSessionId) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const list = await cmApi.list("sessions", { campaign_id: activeCampaignId });
        if (cancelled) return;

        setRecords((p) => ({ ...p, sessions: list }));

        const storedSessionId = localStorage.getItem(LS_SESSION);
        const stored = Array.isArray(list) ? list.find((s) => s.id === storedSessionId) : null;

        const chosen = stored ?? newestByCreatedAt(list) ?? null;

        if (chosen) {
          localStorage.setItem(LS_SESSION, chosen.id);
          ensuredSessionForCampaignRef.current = activeCampaignId;

          // Only update context if different (prevents loops)
          if (!activeSessionId || activeSessionId !== chosen.id) {
            setCampaignContext({ campaign, session: chosen });
          }
        } else {
          // No sessions for this campaign => clear
          localStorage.removeItem(LS_SESSION);
          ensuredSessionForCampaignRef.current = activeCampaignId;
          if (activeSessionId) {
            setCampaignContext({ campaign, session: null });
          }
        }
      } catch {
        // If sessions list fails, don't hard-crash; leave state as-is
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeCampaignId, activeSessionId, campaign, setCampaignContext]);

  /* ------------------------------------------------------------
     3) Load lists for ALL tabs (except campaigns handled above),
        and auto-select newest record.

     For session-scoped tabs, prefer newest record WHERE record.session_id
     matches the selected session, if that field exists.
  ------------------------------------------------------------ */
  useEffect(() => {
    if (activeType === "campaigns") return;

    // For anything other than campaigns, we need a campaign selected
    if (!activeCampaignId) return;

    // For tabs that require a session, do not load/select until session exists
    if (REQUIRES_SESSION.has(activeType) && !activeSessionId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const params =
          activeType === "sessions"
            ? { campaign_id: activeCampaignId }
            : {
                campaign_id: activeCampaignId,
                // Pass session_id if available; safe even if backend ignores it
                ...(activeSessionId ? { session_id: activeSessionId } : {}),
              };

        const list = await cmApi.list(activeType, params);
        if (cancelled) return;

        setRecords((p) => ({ ...p, [activeType]: list }));

        // Always auto-select newest for this tab (no per-entity persistence).
        let chosen = null;

        if (activeType === "sessions") {
          // Newest session (or stored already handled in ensure-session effect)
          chosen = newestByCreatedAt(list);
          if (chosen) {
            setSelectedId(chosen.id);
            setSelectedRecord(chosen);

            // Keep context in sync if user is viewing sessions tab
            localStorage.setItem(LS_SESSION, chosen.id);
            setCampaignContext({ campaign, session: chosen });
          } else {
            setSelectedId(null);
            setSelectedRecord(null);
          }
        } else {
          // Session-scoped selection: if records include session_id, filter by current session
          const hasSessionField =
            Array.isArray(list) && list.length > 0 && Object.prototype.hasOwnProperty.call(list[0], "session_id");

          const scopedList =
            hasSessionField && activeSessionId
              ? list.filter((r) => r?.session_id === activeSessionId)
              : list;

          chosen = newestByCreatedAt(scopedList);

          if (chosen) {
            setSelectedId(chosen.id);
            setSelectedRecord(chosen);
          } else {
            setSelectedId(null);
            setSelectedRecord(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeType, activeCampaignId, activeSessionId, campaign, setCampaignContext]);

  /* ------------------------------------------------------------
     4) CRUD
  ------------------------------------------------------------ */
  const handleCreate = () => {
    const id = uuidv4();

    const base = {
      id,
      _isNew: true,
      campaign_id: campaign?.id,
      ...(activeSessionId ? { session_id: activeSessionId } : {}),
    };

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
    setSelectedId(saved.id);
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;

    await cmApi.remove(activeType, selectedRecord.id);

    setRecords((p) => ({
      ...p,
      [activeType]: (p[activeType] || []).filter((r) => r.id !== selectedRecord.id),
    }));

    // After delete, auto-select newest remaining
    const remaining = (activeList || []).filter((r) => r.id !== selectedRecord.id);
    const chosen = newestByCreatedAt(remaining);

    if (chosen) {
      setSelectedId(chosen.id);
      setSelectedRecord(chosen);
    } else {
      setSelectedId(null);
      setSelectedRecord(null);
    }
  };

  /* ------------------------------------------------------------
     5) Render
  ------------------------------------------------------------ */
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

            {loading && <div className="cm-muted" style={{ marginLeft: "auto" }}>Loading…</div>}
          </div>

          <div className="cm-content">
            <section className="cm-list">
              {(activeList || []).map((r) => (
                <div
                  key={r.id}
                  className={`cm-list-item ${r.id === selectedId ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedId(r.id);
                    setSelectedRecord(r);

                    if (activeType === "campaigns") {
                      localStorage.setItem(LS_CAMPAIGN, r.id);
                      localStorage.removeItem(LS_SESSION);
                      ensuredSessionForCampaignRef.current = null;
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
                <div className="cm-detail-empty">
                  {/* This should only happen when the active list is truly empty (Rule #1) */}
                  <div>Select a record.</div>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
