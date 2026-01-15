"use client";

import React, { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { cmApi } from "@/lib/cm/api";
import { getFormComponent } from "@/components/forms";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

import "./campaign-manager.css";

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

function isProbablyReactComponent(v) {
  // Accept function components + forwardRef/memo objects (best-effort)
  if (!v) return false;
  if (typeof v === "function") return true;
  if (typeof v === "object") {
    // React.memo / forwardRef have $$typeof
    return !!v.$$typeof;
  }
  return false;
}

function getRecordLabel(type, r) {
  if (!r) return "(unnamed)";
  if (type === "players") {
    const s = `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();
    return s || "(unnamed)";
  }
  if (typeof r.name === "string" && r.name.trim()) return r.name;
  return "(unnamed)";
}

/* ------------------------------------------------------------
   Error Boundary (prevents whole page from crashing)
------------------------------------------------------------ */
class DetailErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, err: null };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, err };
  }
  componentDidCatch(err, info) {
    console.error("[CampaignManager] Detail pane crashed:", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="cm-detail-empty">
          Detail pane failed to render. Check console for the actual component/line.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CampaignManagerPage() {
  const { campaign, setCampaignContext } = useCampaignContext();

  const [activeType, setActiveType] = useState("campaigns");
  const [records, setRecords] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  const campaignId = campaign?.id;

  // Safe setter (NO DOM inspection)
  const safeSetSelectedRecord = (next) => {
    setSelectedRecord(next);
  };

  /* ---------------------------------------------
     Load records
  --------------------------------------------- */
  useEffect(() => {
    if (activeType !== "campaigns" && !campaignId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const list =
          activeType === "campaigns"
            ? await cmApi.list("campaigns")
            : await cmApi.list(activeType, { campaign_id: campaignId });

        if (cancelled) return;

        const safeList = Array.isArray(list) ? list : [];
        setRecords((p) => ({ ...p, [activeType]: safeList }));

        // Auto-select first record only if none selected yet
        if (!selectedId && safeList.length) {
          const first = safeList[0];
          setSelectedId(first?.id ?? null);
          safeSetSelectedRecord(first ?? null);

          if (activeType === "campaigns") {
            setCampaignContext({ campaign: first, session: null });
          }
        }
      } catch (err) {
        console.error("[CampaignManager] load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally NOT depending on selectedId to avoid re-load loops
  }, [activeType, campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------------------------------------
     CRUD
  --------------------------------------------- */
  const handleCreate = () => {
    if (activeType !== "campaigns" && !campaignId) return;

    const id = uuidv4();
    const record = {
      id,
      _isNew: true,
      campaign_id: campaignId,
    };

    setRecords((p) => ({
      ...p,
      [activeType]: [record, ...(p[activeType] || [])],
    }));

    setSelectedId(id);
    safeSetSelectedRecord(record);
  };

  const handleSave = async () => {
    if (!selectedRecord) return;

    try {
      const { _isNew, id, __pendingImageClipId, ...payload } = selectedRecord;

      const saved = _isNew
        ? await cmApi.create(activeType, payload)
        : await cmApi.update(activeType, id, payload);

      setRecords((p) => ({
        ...p,
        [activeType]: (p[activeType] || []).map((r) => {
          if (!r) return r;
          return r.id === (_isNew ? id : saved.id) ? saved : r;
        }),
      }));

      setSelectedId(saved.id);
      safeSetSelectedRecord(saved);

      // Attach image AFTER save (NPCs only)
      if (activeType === "npcs" && __pendingImageClipId) {
        try {
          await fetch("/api/npc-image", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              npc_id: saved.id,
              clip_id: __pendingImageClipId,
            }),
          });
        } catch (err) {
          console.error("[NPC image attach failed]", err);
          // DO NOT throw
        }
      }
    } catch (err) {
      console.error("[handleSave failed]", err);
      // DO NOT throw
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;

    try {
      await cmApi.remove(activeType, selectedRecord.id);

      setRecords((p) => ({
        ...p,
        [activeType]: (p[activeType] || []).filter(
          (r) => r.id !== selectedRecord.id
        ),
      }));

      safeSetSelectedRecord(null);
      setSelectedId(null);
    } catch (err) {
      console.error("[handleDelete failed]", err);
    }
  };

  /* ---------------------------------------------
     Form resolution (guarded)
  --------------------------------------------- */
 const Form = null;

  console.log(
    "[CampaignManager] getFormComponent()",
    {
      activeType,
      candidate,
      typeofCandidate: typeof candidate,
      hasDollarType: !!candidate?.$$typeof,
    }
  );

  if (!isProbablyReactComponent(candidate)) {
    console.error(
      "[CampaignManager] Invalid form component returned from getFormComponent:",
      { activeType, candidate }
    );
    return null;
  }

  return candidate;
}, [activeType]);
  /* ---------------------------------------------
     Render
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
              type="button"
            >
              {c.label}
            </button>
          ))}
        </aside>

        <section className="cm-main">
          <div className="cm-main-header">
            <div className="cm-main-title">{activeType}</div>
            {campaign && (
              <div className="cm-context-line">
                <strong>Campaign:</strong>{" "}
                {typeof campaign.name === "string" ? campaign.name : "—"}
              </div>
            )}
          </div>

          <div className="cm-main-actions">
            <button className="cm-btn" onClick={handleCreate} disabled={loading} type="button">
              + New
            </button>
            <button
              className="cm-btn"
              onClick={handleSave}
              disabled={!selectedRecord || loading}
              type="button"
            >
              Save
            </button>
            <button
              className="cm-btn danger"
              onClick={handleDelete}
              disabled={!selectedRecord || loading}
              type="button"
            >
              Delete
            </button>
          </div>

          <div className="cm-content">
            <section className="cm-list">
              {(records[activeType] || []).map((r) => (
                <div
                  key={r?.id ?? uuidv4()}
                  className={`cm-list-item ${
                    r?.id === selectedId ? "selected" : ""
                  }`}
                  onClick={() => {
                    if (!r?.id) return;
                    setSelectedId(r.id);
                    safeSetSelectedRecord(r);

                    if (activeType === "campaigns") {
                      setCampaignContext({ campaign: r, session: null });
                    }
                  }}
                >
                  {getRecordLabel(activeType, r)}
                </div>
              ))}
            </section>

            <section className="cm-detail">
              {!campaign && activeType !== "campaigns" ? (
                <div className="cm-detail-empty">
                  Select a Campaign from the Campaign tab
                </div>
              ) : !selectedRecord ? (
                <div className="cm-detail-empty">
                  Select a Record from the List to view Details
                </div>
              ) : !Form ? (
                <div className="cm-detail-empty">
                  No valid form registered for "{activeType}". Check console.
                </div>
             ) : (
  <div className="cm-detail-empty">
    Form temporarily disabled for debugging
  </div>
)
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
