"use client";

import React, { useEffect, useState } from "react";
import { withContext } from "@/lib/forms/withContext";
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

  const update = (field, value) => {
    onChange(
      withContext(
        {
          ...record,
          [field]: value,
        },
        {
          campaign_id: campaign.id,
        }
      )
    );
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
     NPC Image (UI only — no POSTs here)
  --------------------------------------------- */
  const [clips, setClips] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);
  const [pendingClipId, setPendingClipId] = useState(null);

  const npcId = record?.id ?? null;
  const isNewNpc = !npcId;

  /* ------------------------------------------------------------
     Reset image UI when switching NPCs
  ------------------------------------------------------------ */
  useEffect(() => {
    setSelectedClip(null);
    setPendingClipId(null);
  }, [record?.id]);

  /* ------------------------------------------------------------
     Load available image clips (tenant scoped)
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
     Sync persisted image from DB (display only)
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!record?.image_clip_id || !clips.length) return;

    const clip = clips.find((c) => c.id === record.image_clip_id) || null;
    setSelectedClip(clip);
    setPendingClipId(null);
  }, [record?.image_clip_id, clips]);

  /* ------------------------------------------------------------
     Expose pending image clip id (no save here)
  ------------------------------------------------------------ */
  useEffect(() => {
    if (typeof onChange !== "function") return;

    onChange(
      withContext(
        {
          ...record,
          __pendingImageClipId: pendingClipId || null,
        },
        {
          campaign_id: campaign.id,
        }
      )
    );
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

            setSelectedClip(clip);
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
