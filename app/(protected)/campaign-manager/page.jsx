"use client";

import React, { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

// ❌ TEMP DISABLED FOR DEBUGGING
// import { cmApi } from "@/lib/cm/api";
// import { getFormComponent } from "@/components/forms";

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
   Error Boundary
------------------------------------------------------------ */
class DetailErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err, info) {
    console.error("[CampaignManager] Detail pane crashed:", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="cm-detail-empty">
          Detail pane failed to render.
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

  const safeSetSelectedRecord = (next) => {
    setSelectedRecord(next);
  };

  /* ---------------------------------------------
     Load records (DISABLED)
  --------------------------------------------- */
  useEffect(() => {
    // ❌ cmApi intentionally disabled
    // This effect is preserved structurally but does nothing
  }, [activeType, campaignId]);

  /* ---------------------------------------------
     CRUD (DISABLED)
  --------------------------------------------- */
  const handleCreate = () => {
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
    // ❌ cmApi disabled
  };

  const handleDelete = async () => {
    // ❌ cmApi disabled
    safeSetSelectedRecord(null);
    setSelectedId(null);
  };

  /* ---------------------------------------------
     Form resolution (DISABLED)
  --------------------------------------------- */
  const Form = null;

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
            <button
              className="cm-btn"
              onClick={handleCreate}
              disabled={loading}
              type="button"
            >
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
                  Form disabled for debugging
                </div>
              ) : (
                <DetailErrorBoundary>
                  <Form
                    record={selectedRecord}
                    onChange={safeSetSelectedRecord}
                  />
                </DetailErrorBoundary>
              )}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
