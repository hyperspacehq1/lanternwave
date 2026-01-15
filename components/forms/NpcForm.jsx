"use client";

import React, { useEffect, useState } from "react";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

/* ------------------------------------------------------------
   Helpers
------------------------------------------------------------ */
function displayFilename(objectKey) {
  if (!objectKey) return "";
  const base = objectKey.split("/").pop();
  return base.replace(/^\d+-/, "");
}

const NPC_TYPES = [
  { value: "", label: "— Select type —" },
  { value: "ally", label: "Ally" },
  { value: "enemy", label: "Enemy" },
  { value: "neutral", label: "Neutral" },
  { value: "merchant", label: "Merchant" },
  { value: "authority", label: "Authority" },
  { value: "mystic", label: "Mystic" },
];

export default function NpcForm({ record, onChange }) {
  const { campaign } = useCampaignContext();

  /* ------------------------------------------------------------
     Guards
  ------------------------------------------------------------ */
  if (!campaign) {
    return (
      <div className="cm-detail-empty">
        Select a Campaign from the Campaign tab
      </div>
    );
  }

  if (!record) {
    return (
      <div className="cm-detail-empty">
        Select a Record from the List to view Details
      </div>
    );
  }

  /* ------------------------------------------------------------
     Local update helper (PLAIN DATA ONLY)
  ------------------------------------------------------------ */
  const update = (field, value) => {
    if (typeof onChange !== "function") return;

    onChange({
      ...record,
      [field]: value,
      campaign_id: campaign.id,
    });
  };

  /* ---------------------------------------------
     Visual pulse when record changes
  --------------------------------------------- */
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [record?.id]);

  /* ---------------------------------------------
     NPC Image (UI state)
  --------------------------------------------- */
  const [clips, setClips] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);
  const [pendingClipId, setPendingClipId] = useState(null);

  const npcId = record?.id ?? null;
  const isNewNpc = !npcId;

  /* ------------------------------------------------------------
     Load available image clips
  ------------------------------------------------------------ */
  useEffect(() => {
    fetch("/api/r2/list", {
      cache: "no-store",
      credentials: "include",
    })
      .then((r) => r.json())
      .then((res) => {
        if (!res?.ok || !Array.isArray(res.rows)) return;

        const images = res.rows.filter((c) =>
          ["image/jpeg", "image/png"].includes(c.mime_type)
        );

        setClips(images);
      })
      .catch((err) => {
        console.error("[NpcForm] failed to load clips", err);
      });
  }, []);

  /* ------------------------------------------------------------
     Sync image display from BOTH:
     - pending UI selection
     - persisted DB state
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!clips.length) return;

    const clipId =
      pendingClipId || record?.image_clip_id || null;

    if (!clipId) {
      setSelectedClip(null);
      return;
    }

    const clip = clips.find((c) => c.id === clipId) || null;
    setSelectedClip(clip);
  }, [pendingClipId, record?.image_clip_id, clips]);

/* ------------------------------------------------------------
   Load existing NPC image from join table (fast workaround)
------------------------------------------------------------ */
useEffect(() => {
  if (!record?.id) return;

  fetch(`/api/npc-image?npc_id=${record.id}`, {
    cache: "no-store",
    credentials: "include",
  })
    .then((r) => r.json())
    .then((res) => {
      if (!res?.ok || !res.clip_id) return;

      // prefer DB-linked image on load
      setPendingClipId(res.clip_id);

      // if clips already loaded, select immediately
      const clip = clips.find((c) => c.id === res.clip_id) || null;
      if (clip) setSelectedClip(clip);
    })
    .catch(() => {});
}, [record?.id, clips]);

  /* ------------------------------------------------------------
     Expose pending image clip id to parent (plain data)
  ------------------------------------------------------------ */
  useEffect(() => {
    if (typeof onChange !== "function") return;

    onChange({
      ...record,
      __pendingImageClipId: pendingClipId || null,
      campaign_id: campaign.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingClipId]);

  return (
    <div className={`cm-detail-form ${pulse ? "pulse" : ""}`}>
      <div className="cm-field">
        <label className="cm-label">Name</label>
        <input
          className="cm-input"
          value={record?.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">NPC Type</label>
        <select
          className="cm-input"
          value={record?.npc_type || ""}
          onChange={(e) => update("npc_type", e.target.value)}
        >
          {NPC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* ---------------- NPC IMAGE ---------------- */}
      <div className="cm-field">
        <label className="cm-label">NPC Image</label>

        <select
          className="cm-input"
          disabled={isNewNpc}
          value={selectedClip?.id || ""}
          onChange={(e) => {
            if (isNewNpc) return;

            const clip =
              clips.find((c) => c.id === e.target.value) || null;

            setPendingClipId(clip ? clip.id : null);
          }}
        >
          <option value="">— No image —</option>
          {clips.map((c) => (
            <option key={c.id} value={c.id}>
              {displayFilename(c.object_key)}
            </option>
          ))}
        </select>

        {isNewNpc && (
          <div className="cm-hint">
            Save the NPC before assigning an image.
          </div>
        )}

        {selectedClip && !isNewNpc && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                width: 240,
                height: 240,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.25)",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <img
                src={`/api/r2/stream?key=${encodeURIComponent(
                  selectedClip.object_key
                )}`}
                alt="NPC"
                loading="lazy"
                decoding="async"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="cm-field">
        <label className="cm-label">Description</label>
        <textarea
          className="cm-textarea"
          value={record?.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Goals</label>
        <textarea
          className="cm-textarea"
          value={record?.goals || ""}
          onChange={(e) => update("goals", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Secrets</label>
        <textarea
          className="cm-textarea"
          value={record?.secrets || ""}
          onChange={(e) => update("secrets", e.target.value)}
        />
      </div>
    </div>
  );
}
