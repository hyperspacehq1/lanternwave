"use client";

import React, { useEffect, useState } from "react";
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

const LS_KEY = "cm:selectedCampaignId";

export default function CampaignManagerPage() {
  const { campaign, setCampaignContext } = useCampaignContext();

  const [activeType, setActiveType] = useState("campaigns");
  const [records, setRecords] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  const campaignId = campaign?.id;

  /* --------------------------------------------------
     Restore selected campaign from localStorage
  -------------------------------------------------- */
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored && !campaign) {
      cmApi.get("campaigns", stored).then((c) => {
        if (c) setCampaignContext({ campaign: c, session: null });
      });
    }
  }, []);

  /* --------------------------------------------------
     Load records
  -------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        let list = [];

        if (activeType === "campaigns") {
          list = await cmApi.list("campaigns");

          // ✅ newest first
          list = [...list].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );
        } else {
          if (!campaignId) return;

          if (activeType === "npcs") {
            const res = await fetch(
              `/api/npcs-with-images?campaign_id=${campaignId}`,
              { credentials: "include" }
            );
            const data = await res.json();
            list = data.rows || [];
          } else {
            list = await cmApi.list(activeType, { campaign_id: campaignId });
          }
        }

        if (cancelled) return;

        setRecords((p) => ({ ...p, [activeType]: list }));

        // ----------------------------------
        // Auto-select logic
        // ----------------------------------
        if (activeType === "campaigns") {
          const stored = localStorage.getItem(LS_KEY);
          const selected =
            list.find((c) => c.id === stored) || list[0];

          if (selected) {
            setSelectedId(selected.id);
            setSelectedRecord(selected);
            setCampaignContext({ campaign: selected, session: null });
            localStorage.setItem(LS_KEY, selected.id);
          }
        } else {
          setSelectedId(null);
          setSelectedRecord(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeType, campaignId]);

  /* --------------------------------------------------
     CRUD
  -------------------------------------------------- */
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
    setSelectedRecord(record);
  };

  const handleSave = async () => {
    if (!selectedRecord) return;

    const { _isNew, id, __pendingImageClipId, ...payload } =
      selectedRecord;

    const saved = _isNew
      ? await cmApi.create(activeType, payload)
      : await cmApi.update(activeType, id, payload);

    setRecords((p) => ({
      ...p,
      [activeType]: p[activeType].map((r) =>
        r.id === (_isNew ? id : saved.id) ? saved : r
      ),
    }));

    setSelectedId(saved.id);
    setSelectedRecord(saved);

    if (activeType === "campaigns") {
      setCampaignContext({ campaign: saved, session: null });
      localStorage.setItem(LS_KEY, saved.id);
    }

    if (activeType === "npcs" && __pendingImageClipId) {
      await fetch("/api/npc-image", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npc_id: saved.id,
          clip_id: __pendingImageClipId,
        }),
      });
    }
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

    setSelectedId(null);
    setSelectedRecord(null);
  };

  /* --------------------------------------------------
     Render
  -------------------------------------------------- */
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
              onClick={() => {
                setActiveType(c.id);
                setSelectedId(null);
                setSelectedRecord(null);
              }}
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
            <button className="cm-btn" onClick={handleSave}>
              Save
            </button>
            <button className="cm-btn danger" onClick={handleDelete}>
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
                  }}
                >
                  {r.name || "(unnamed)"}
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
                <div className="cm-detail-empty">
                  Select a Record from the List
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
