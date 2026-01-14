"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
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
  const { campaign, session } = useCampaignContext();

  /* ------------------------------------------------------------
     Guards
  ------------------------------------------------------------ */
  if (!campaign) {
    return (
      <div className="cm-detail-empty">
        <h3>No Campaign Selected</h3>
        <p>Please select or create a campaign.</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="cm-detail-empty">
        <h3>No Session Selected</h3>
        <p>Please select a session.</p>
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
          session_id: session.id,
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
     NPC Image handling
  --------------------------------------------- */
  const [clips, setClips] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);

  const npcId = record?.id || null;

  // Load image clips
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

  // Sync existing image (if parent provided it)
  useEffect(() => {
    if (!record?.image_clip_id || !clips.length) return;

    const clip = clips.find((c) => c.id === record.image_clip_id) || null;
    setSelectedClip(clip);
  }, [record?.image_clip_id, clips]);

  const attachImage = async (clipId) => {
    if (!npcId || !clipId) return;

    await fetch(`/api/npcs/${npcId}/image`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clip_id: clipId }),
    });
  };

  const removeImage = async () => {
    if (!npcId) return;

    await fetch(`/api/npcs/${npcId}/image`, {
      method: "DELETE",
      credentials: "include",
    });

    setSelectedClip(null);
  };

  return (
    <div className="cm-detail-form">
      <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
        <div className="cm-context-line">
          <strong>Campaign:</strong> {campaign.name}
        </div>
        <div className="cm-context-line">
          <strong>Session:</strong> {session.name}
        </div>
      </div>

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
          value={selectedClip?.id || ""}
          onChange={(e) => {
            const clip =
              clips.find((c) => c.id === e.target.value) || null;

            setSelectedClip(clip);

            if (clip) {
              attachImage(clip.id);
            }
          }}
        >
          <option value="">— No image —</option>
          {clips.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title || displayFilename(c.object_key)}
            </option>
          ))}
        </select>

        {selectedClip && (
          <div style={{ marginTop: 12 }}>
            <Image
src={`/api/r2/object/${selectedClip.object_key}`}
              )}`}
              alt="NPC"
              width={200}
              height={200}
              style={{
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />

            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="cm-button danger"
                onClick={removeImage}
              >
                Remove Image
              </button>
            </div>
          </div>
        )}
      </div>
      {/* ------------------------------------------------ */}

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
