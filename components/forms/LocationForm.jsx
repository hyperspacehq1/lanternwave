"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCampaignContext } from "@/lib/campaign/campaignContext";
import JoinPanel from "@/components/JoinPanel";

/* ------------------------------------------------------------
   Helpers
------------------------------------------------------------ */
function displayFilename(objectKey) {
  if (!objectKey) return "";
  const base = objectKey.split("/").pop();
  return base.replace(/^\d+-/, "");
}

export default function LocationForm({ record, onChange }) {
  const { campaign } = useCampaignContext();

  /* ---------------------------------------------
     Guards
  --------------------------------------------- */
  if (!campaign) {
    return (
      <div className="cm-detail-empty">
        <h3>No Campaign Selected</h3>
        <p>Please select or create a campaign.</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="cm-detail-empty">
        <h3>No Location Selected</h3>
        <p>Select a location or create a new one.</p>
      </div>
    );
  }

  const isNewLocation = !record.id;

  /* ---------------------------------------------
     Campaign-scoped update helper
  --------------------------------------------- */
  const update = (field, value) => {
    onChange({
      ...record,
      [field]: value,
      campaign_id: campaign.id,
    });
  };

  /* ---------------------------------------------
     Visual pulse on record change
  --------------------------------------------- */
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1200);
    return () => clearTimeout(t);
  }, [record.id]);

  /* ---------------------------------------------
     IMAGE STATE (RESTORED)
  --------------------------------------------- */
  const [clips, setClips] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);
  const [pendingClipId, setPendingClipId] = useState(null);

  /* Reset image UI when switching records */
  useEffect(() => {
    setSelectedClip(null);
    setPendingClipId(null);
  }, [record.id]);

  /* Load available image clips */
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
      .catch(() => {});
  }, []);

  /* Load existing Location image */
  useEffect(() => {
    if (!record.id || !clips.length) return;

    fetch(`/api/location-image?location_id=${record.id}`, {
      cache: "no-store",
      credentials: "include",
    })
      .then((r) => r.json())
      .then((res) => {
        if (!res?.ok || !res.clip_id) return;

        const clip = clips.find((c) => c.id === res.clip_id) || null;
        setSelectedClip(clip);
        setPendingClipId(res.clip_id);
      })
      .catch(() => {});
  }, [record.id, clips]);

  /* Expose pending image clip id to parent */
  useEffect(() => {
    onChange({
      ...record,
      __pendingImageClipId: pendingClipId || null,
      campaign_id: campaign.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingClipId]);

  /* ---------------------------------------------
     Address toggle
  --------------------------------------------- */
  const [hasAddress, setHasAddress] = useState(false);
  useEffect(() => {
    setHasAddress(
      !!(
        record.address_street ||
        record.address_city ||
        record.address_state ||
        record.address_zip ||
        record.address_country
      )
    );
  }, [record]);

  /* ---------------------------------------------
     AI helpers (unchanged)
  --------------------------------------------- */
  const [colorLoading, setColorLoading] = useState(false);
  const [sensoryLoading, setSensoryLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const canUseAI = useMemo(
    () => !!(record.id && campaign.id),
    [record.id, campaign.id]
  );

  /* ---------------------------------------------
     Render
  --------------------------------------------- */
  return (
    <div className="cm-detail-form">
      {/* Header */}
      <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
        <div className="cm-context-line">
          <strong>Campaign:</strong> {campaign.name}
        </div>
        <div className="cm-context-line">
          <strong>Location:</strong> {record.name || "Unnamed Location"}
        </div>
      </div>

      {/* Name */}
      <div className="cm-field">
        <label className="cm-label">Name *</label>
        <input
          className="cm-input"
          value={record.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      {/* LOCATION IMAGE (RESTORED) */}
      <div className="cm-field">
        <label className="cm-label">Location Image</label>

        <select
          className="cm-input"
          disabled={isNewLocation}
          value={selectedClip?.id || ""}
          onChange={(e) => {
            if (isNewLocation) return;

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

        {isNewLocation && (
          <div className="cm-hint">
            Save the location before assigning an image.
          </div>
        )}

        {selectedClip && !isNewLocation && (
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
                alt="Location"
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

      {/* ---------------------------------------------
          Related Items
      --------------------------------------------- */}
      {record._isNew && (
        <div className="cm-muted">Save the location before adding items.</div>
      )}

      {!record._isNew && (
        <JoinPanel
          title="Items"
          campaignId={campaign.id}
          locationId={record.id}
          joinPath="items"
          idField="item_id"
        />
      )}
    </div>
  );
}
