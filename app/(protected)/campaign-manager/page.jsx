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

export default function CampaignManagerPage() {
  const { campaign, setCampaignContext } = useCampaignContext();

  const [activeType, setActiveType] = useState("campaigns");
  const [records, setRecords] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  const campaignId = campaign?.id;

  /* ---------------------------------------------
     Load records (CAMPAIGN ONLY)
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

        setRecords((p) => ({ ...p, [activeType]: list }));

        if (!selectedId && list?.length) {
          setSelectedId(list[0].id);
          setSelectedRecord(list[0]);

          if (activeType === "campaigns") {
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
  }, [activeType, campaignId]);

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
    setSelectedRecord(record);
  };

 const handleSave = async () => {
  if (!selectedRecord) return;

  try {
    const {
      _isNew,
      id,
      __pendingImageClipId,
      ...payload
    } = selectedRecord;

    // 1) Save NPC
    const saved = _isNew
      ? await cmApi.create(activeType, payload)
      : await cmApi.update(activeType, id, payload);

    // 2) Update state
   setRecords((p) => ({
  ...p,
  [activeType]: (p[activeType] || []).map((r) => {
    if (!r) return r;               // 🔴 guard nulls
    return r.id === (_isNew ? id : saved.id)
      ? saved
      : r;
  }),
}));

    setSelectedId(saved.id);
    setSelectedRecord(saved);

    // 3) Attach image AFTER save (NPCs only)
    if (
      activeType === "npcs" &&
      __pendingImageClipId
    ) {
      try {
        await cmApi.post(
          `npcs/${saved.id}/image`,
          { clip_id: __pendingImageClipId }
        );
      } catch (err) {
        console.error(
          "[NPC image attach failed]",
          err
        );
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

    await cmApi.remove(activeType, selectedRecord.id);

    setRecords((p) => ({
      ...p,
      [activeType]: p[activeType].filter(
        (r) => r.id !== selectedRecord.id
      ),
    }));

    setSelectedRecord(null);
    setSelectedId(null);
  };

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
                <strong>Campaign:</strong> {campaign.name}
              </div>
            )}
          </div>

          <div className="cm-main-actions">
            <button className="cm-btn" onClick={handleCreate} disabled={loading}>
              + New
            </button>
            <button className="cm-btn" onClick={handleSave} disabled={!selectedRecord}>
              Save
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
                      setCampaignContext({ campaign: r, session: null });
                    }
                  }}
                >
                  {r.name || "(unnamed)"}
                </div>
              ))}
            </section>

            <section className="cm-detail">
              {!campaign && activeType !== "campaigns" ? (
                <div className="cm-detail-empty">
                  Select a Campaign from the Campaign tab
                </div>
              ) : selectedRecord ? (
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
                  Select a Record from the List to view Details
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
