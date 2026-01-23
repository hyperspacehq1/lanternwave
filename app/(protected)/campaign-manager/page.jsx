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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const campaignId = campaign?.id;
  const selectedRecord = selectedByType[activeType] || null;

  /* ------------------------------------------------------------
     Load records for active type
  ------------------------------------------------------------ */
useEffect(() => {
  let cancelled = false;

  ;(async () => {
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

        if (list.length) {
          const selected = campaign
            ? list.find((c) => c.id === campaign.id)
            : list[0];

          if (selected) {
            if (!campaign) {
              setCampaignContext({ campaign: selected });
            }

            setSelectedByType((p) => ({
              ...p,
              campaigns: selected,
            }));
          }
        }
      }

      // -------------------------------
      // ALL OTHER TYPES
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

  // ✅ Enforce same invariant as Items/Locations: never show soft-deleted rows
  list = (data.rows || []).filter((r) => !r?.deleted_at);
}

else if (activeType === "locations") {
  const res = await fetch(
    `/api/locations-with-images?campaign_id=${campaignId}`,
    { credentials: "include" }
  );
  const data = await res.json();
  list = data.rows || [];
}
else if (activeType === "items") {
  const res = await fetch(
    `/api/items-with-images?campaign_id=${campaignId}`,
    { credentials: "include" }
  );
  const data = await res.json();
  list = data.rows || [];
}
else {
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

  // Only campaigns require confirmation
  if (activeType === "campaigns") {
    setShowDeleteConfirm(true);
    return;
  }

  // Existing behavior for all other tabs
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

const confirmCampaignDelete = async () => {
  if (!selectedRecord) return;

  const res = await fetch(
  `/api/campaigns?id=${selectedRecord.id}`,
  {
    method: "DELETE",
    credentials: "include",
  }
);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  setRecordsByType((p) => ({
    ...p,
    campaigns: p.campaigns.filter(
      (c) => c.id !== selectedRecord.id
    ),
  }));

  setSelectedByType((p) => ({
    ...p,
    campaigns: null,
  }));

  setCampaignContext({ campaign: null });
  setShowDeleteConfirm(false);
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
              Save/Update
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
  {activeType === "players"
    ? r.character_name || "(unnamed)"
    : r.name || "(unnamed)"}
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

      {showDeleteConfirm && activeType === "campaigns" && (
        <div className="cm-modal-backdrop">
          <div className="cm-modal danger">
            <h3 className="cm-modal-title">Delete Campaign</h3>

            <p className="cm-modal-text">
              Are you sure you want to delete the{" "}
              <strong>
                “{selectedRecord?.name || "Unnamed Campaign"}”
              </strong>{" "}
              campaign?
            </p>

            <p className="cm-modal-warning">
              This will permanently delete the campaign and all related
              content (sessions, events, NPCs, locations, players, and items).
            </p>

            <div className="cm-modal-actions">
              <button
                className="cm-button"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>

              <button
                className="cm-button danger"
                onClick={confirmCampaignDelete}
              >
                Yes, Delete Campaign
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
