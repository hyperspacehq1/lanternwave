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

export default function ItemForm({ record, onChange }) {
  const { campaign } = useCampaignContext();

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

  if (!record) {
    return (
      <div className="cm-detail-empty">
        <h3>No Item Selected</h3>
        <p>Select an item or create a new one.</p>
      </div>
    );
  }

  const isNewItem = !record.id;

  /* ------------------------------------------------------------
     Campaign-scoped update helper
  ------------------------------------------------------------ */
  const update = (field, value) => {
    onChange({
      ...record,
      [field]: value,
      campaign_id: campaign.id,
    });
  };

  /* ------------------------------------------------------------
     Visual pulse on record change
  ------------------------------------------------------------ */
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [record.id]);

  /* ------------------------------------------------------------
     IMAGE STATE (RESTORED)
  ------------------------------------------------------------ */
  const [clips, setClips] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);
  const [pendingClipId, setPendingClipId] = useState(null);

  /* Reset image UI when switching items */
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

  /* Load existing Item image */
  useEffect(() => {
    if (!record.id || !clips.length) return;

    fetch(`/api/item-image?item_id=${record.id}`, {
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

  return (
    <div className="cm-detail-form">
      {/* Header */}
      <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
        <div className="cm-context-line">
          <strong>Campaign:</strong> {campaign.name}
        </div>
        <div className="cm-context-line">
          <strong>Item:</strong> {record.name || "Unnamed Item"}
        </div>
      </div>

      {/* Name */}
      <div className="cm-field">
        <label className="cm-label">Name</label>
        <input
          className="cm-input"
          value={record.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      {/* ITEM IMAGE (RESTORED) */}
      <div className="cm-field">
        <label className="cm-label">Item Image</label>

        <select
          className="cm-input"
          disabled={isNewItem}
          value={selectedClip?.id || ""}
          onChange={(e) => {
            if (isNewItem) return;

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

        {isNewItem && (
          <div className="cm-hint">
            Save the item before assigning an image.
          </div>
        )}

        {selectedClip && !isNewItem && (
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
                alt="Item"
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

      {/* Item Type */}
      <div className="cm-field">
        <label className="cm-label">Item Type</label>
        <select
          className="cm-input"
          value={record.itemType || record.item_type || ""}
          onChange={(e) => update("itemType", e.target.value || null)}
        >
          <option value="">— Select Item Type —</option>
          <option value="Weapon">Weapon</option>
          <option value="Armor">Armor</option>
          <option value="Accessory">Accessory</option>
          <option value="Clothing">Clothing</option>
          <option value="Consumable">Consumable</option>
          <option value="Equipment">Equipment</option>
          <option value="Tool">Tool</option>
          <option value="Ammunition">Ammunition</option>
          <option value="Magic Item">Magic Item</option>
          <option value="Trade Good">Trade Good</option>
          <option value="Currency">Currency</option>
          <option value="Quest Item">Quest Item</option>
          <option value="Book / Knowledge">Book / Knowledge</option>
          <option value="Vehicle">Vehicle</option>
          <option value="Structure">Structure</option>
          <option value="Crafting Material">Crafting Material</option>
          <option value="Technology">Technology</option>
        </select>
      </div>

      {/* Description */}
      <div className="cm-field">
        <label className="cm-label">Description</label>
        <textarea
          className="cm-textarea"
          value={record.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      {/* Notes */}
      <div className="cm-field">
        <label className="cm-label">Notes</label>
        <textarea
          className="cm-textarea"
          value={record.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>

      {/* Properties */}
      <div className="cm-field">
        <label className="cm-label">Properties</label>
        <textarea
          className="cm-textarea"
          value={
            record.properties
              ? JSON.stringify(record.properties, null, 2)
              : ""
          }
          onChange={(e) => {
            try {
              update(
                "properties",
                e.target.value ? JSON.parse(e.target.value) : null
              );
            } catch {
              // allow partial JSON while typing
            }
          }}
        />
      </div>
    </div>
  );
}
