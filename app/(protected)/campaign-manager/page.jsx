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

const PAGE_VERSION = "1.01";

export default function CampaignManagerPage() {
  const { campaign, setCampaignContext } = useCampaignContext();

  const [activeType, setActiveType] = useState("campaigns");
  const [recordsByType, setRecordsByType] = useState({});
  const [selectedByType, setSelectedByType] = useState({});
  const [loading, setLoading] = useState(false);

  const campaignId = campaign?.id;
  const selectedRecord = selectedByType[activeType] || null;

  /* ------------------------------------------------------------
     Load records for active type
  ------------------------------------------------------------ */
  useEffect(() => {
  let cancelled = false;

  (async () => {
    setLoading(true);

    try {
      let list = [];

      // -------------------------------
      // CAMPAIGNS
      // -------------------------------
      if (activeType === "campaigns") {
        list = await cmApi.list("campaigns");

        list = [...list].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        // Ensure campaign is selected in BOTH context and list
if (list.length) {
  const selected = campaign
    ? list.find((c) => c.id === campaign.id)
    : list[0];

  if (selected) {
    // Set context only if missing
    if (!campaign) {
      setCampaignContext({ campaign: selected });
    }

    // Always select the campaign record for the form
    setSelectedByType((p) => ({
      ...p,
      campaigns: selected,
    }));
  }
}

      // -------------------------------
      // ALL OTHER TYPES (campaign-scoped)
      // -------------------------------
      else {
        if (!campaignId) {
          setRecordsByType((p) => ({ ...p, [activeType]: [] }));
          return;
        }

        if (activeType === "npcs") {
          const res = await fetch(
            `/api/npcs-with-images?campaign_id=${campaignId}`,
            { credentials: "include" }
          );
          const data = await res.json();
          list = data.rows || [];
        } else {
          list = await cmApi.list(activeType, {
            campaign_id: campaignId,
          });
        }
      }

      if (cancelled) return;

      setRecordsByType((p) => ({
        ...p,
        [activeType]: list,
      }));

      // Auto-select first record per tab (not campaigns)
      if (
        activeType !== "campaigns" &&
        !selectedByType[activeType] &&
        list.length
      ) {
        setSelectedByType((p) => ({
          ...p,
          [activeType]: list[0],
        }));
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  })();

  return () => {
    cancelled = true;
  };
}, [activeType, campaignId, campaign]);

  /* ------------------------------------------------------------
     CRUD
  ------------------------------------------------------------ */
  const handleCreate = () => {
    if (activeType !== "campaigns" && !campaignId) return;

    const id = uuidv4();
    const record = {
      id,
      _isNew: true,
      campaign_id: campaignId,
    };

    setRecordsByType((p) => ({
      ...p,
      [activeType]: [record, ...(p[activeType] || [])],
    }));

    setSelectedByType((p) => ({
      ...p,
      [activeType]: record,
    }));
  };

  const handleSave = async () => {
    if (!selectedRecord) return;

    const { _isNew, id, __pendingImageClipId, ...payload } = selectedRecord;

    const saved = _isNew
      ? await cmApi.create(activeType, payload)
      : await cmApi.update(activeType, id, payload);

    setRecordsByType((p) => ({
      ...p,
      [activeType]: p[activeType].map((r) =>
        r.id === (_isNew ? id : saved.id) ? saved : r
      ),
    }));

    setSelectedByType((p) => ({
      ...p,
      [activeType]: saved,
    }));

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

    setRecordsByType((p) => ({
      ...p,
      [activeType]: p[activeType].filter(
        (r) => r.id !== selectedRecord.id
      ),
    }));

    setSelectedByType((p) => ({
      ...p,
      [activeType]: null,
    }));
  };

  /* ------------------------------------------------------------
     Render
  ------------------------------------------------------------ */
  return (
    <div className="cm-root">
      <div className="cm-layout">
        {/* LEFT COLUMN — TABS */}
        <aside className="cm-sidebar">
          <h1 className="cm-title">
  Campaign Manager
  <div
    style={{
      marginTop: "4px",
      fontSize: "10px",
      letterSpacing: "0.18em",
      opacity: 0.55,
    }}
  >
    v{PAGE_VERSION}
  </div>
</h1>

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

        {/* CENTER + RIGHT */}
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
            {/* MIDDLE COLUMN — LIST */}
            <section className="cm-list">
              {(recordsByType[activeType] || []).map((r) => (
                <div
                  key={r.id}
                  className={`cm-list-item ${
                    selectedRecord?.id === r.id ? "selected" : ""
                  }`}
                  onClick={() => {
  setSelectedByType((p) => ({
    ...p,
    [activeType]: r,
  }));

  if (activeType === "campaigns") {
    setCampaignContext({ campaign: r });
  }
}}
                >
                  {r.name || "(unnamed)"}
                </div>
              ))}
            </section>

            {/* RIGHT COLUMN — DETAIL */}
            <section className="cm-detail">
              {selectedRecord ? (
                (() => {
                  const Form = getFormComponent(activeType);
                  return (
                    <Form
                      record={selectedRecord}
                      onChange={(r) =>
                        setSelectedByType((p) => ({
                          ...p,
                          [activeType]: r,
                        }))
                      }
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
