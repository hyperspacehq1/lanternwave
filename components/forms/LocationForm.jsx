"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCampaignContext } from "@/lib/campaign/campaignContext";
import JoinPanel from "@/components/JoinPanel";

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
     AI helpers
  --------------------------------------------- */
  const [colorLoading, setColorLoading] = useState(false);
  const [sensoryLoading, setSensoryLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const canUseAI = useMemo(
    () => !!(record.id && campaign.id),
    [record.id, campaign.id]
  );

  function sensoryToTextareaValue(sensory) {
    if (!sensory) return "";

    if (typeof sensory === "object") {
      if (sensory.hear != null || sensory.smell != null) {
        return `Hear:\n${sensory.hear || ""}\n\nSmell:\n${sensory.smell || ""}`.trim();
      }

      if (sensory.text != null) return String(sensory.text);

      try {
        return JSON.stringify(sensory, null, 2);
      } catch {
        return "";
      }
    }

    return String(sensory);
  }

  function colorDetailToTextareaValue(detail) {
    if (!detail || typeof detail !== "object") return "";
    if (!Array.isArray(detail.bullets)) return "";
    return detail.bullets.map((b) => `• ${b}`).join("\n");
  }

  /* ---------------------------------------------
     Echo helper (animation trigger)
  --------------------------------------------- */
  function triggerEcho(e) {
    const btn = e.currentTarget;
    btn.classList.remove("ai-echo");
    void btn.offsetWidth; // force reflow
    btn.classList.add("ai-echo");
  }

  /* ---------------------------------------------
     AI actions
  --------------------------------------------- */
  async function generateColorDetail() {
    setAiError("");

    if (!canUseAI) {
      setAiError("Save the location before generating color detail.");
      return;
    }

    setColorLoading(true);

    try {
      const res = await fetch("/api/ai/locations/color-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: record.id,
          campaign_id: campaign.id,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.color_detail) {
        setAiError(data?.error || "AI generation failed.");
        return;
      }

update("color_detail", data.color_detail);

    } catch (e) {
      setAiError(String(e?.message || e));
    } finally {
      setColorLoading(false);
    }
  }

  async function generateSensory() {
    setAiError("");

    if (!canUseAI) {
      setAiError("Save the location before generating sensory data.");
      return;
    }

    setSensoryLoading(true);

    try {
      const res = await fetch("/api/ai/locations/sensory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: record.id,
          campaign_id: campaign.id,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.sensory) {
        setAiError(data?.error || "AI generation failed.");
        return;
      }

      const saveRes = await fetch(`/api/locations?id=${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensory: data.sensory }),
      });

      const saved = await saveRes.json().catch(() => null);

      if (!saveRes.ok || !saved) {
        setAiError("Generated sensory, but failed to save.");
        return;
      }

      update("sensory", saved.sensory);
    } catch (e) {
      setAiError(String(e?.message || e));
    } finally {
      setSensoryLoading(false);
    }
  }

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
          <strong>Location:</strong>{" "}
          {record.name || "Unnamed Location"}
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

      {/* World */}
      <div className="cm-field">
        <label className="cm-label">World</label>
        <input
          className="cm-input"
          value={record.world || ""}
          onChange={(e) => update("world", e.target.value)}
        />
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

      {/* Color Detail + AI */}
      <div className="cm-field">
        <label className="cm-label" style={{ display: "flex", gap: 10 }}>
          Detail Echoes
          <button
            type="button"
            onClick={(e) => {
              triggerEcho(e);
              generateColorDetail();
            }}
            disabled={!canUseAI || colorLoading}
            className="ai-echo-btn"
            style={{ marginLeft: "auto" }}
          >
            {colorLoading ? "Generating…" : "Detail Echoes"}
          </button>
        </label>

        <textarea
          className="cm-textarea"
          value={colorDetailToTextareaValue(record.color_detail)}
          onChange={(e) => {
            const bullets = e.target.value
              .split("\n")
              .map((l) => l.replace(/^•\s*/, "").trim())
              .filter(Boolean)
              .slice(0, 3);

            update("color_detail", { bullets });
          }}
        />

        {!!aiError && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#2d8cff" }}>
            {aiError}
          </div>
        )}
      </div>

      {/* Sensory + AI */}
      <div className="cm-field">
        <label className="cm-label" style={{ display: "flex", gap: 10 }}>
          Sensory Echoes
          <button
            type="button"
            onClick={(e) => {
              triggerEcho(e);
              generateSensory();
            }}
            disabled={!canUseAI || sensoryLoading}
            className="ai-echo-btn"
            style={{ marginLeft: "auto" }}
          >
            {sensoryLoading ? "Generating…" : "Sensory Echoes"}
          </button>
        </label>

        <textarea
          className="cm-textarea"
          value={sensoryToTextareaValue(record.sensory)}
          onChange={(e) => update("sensory", e.target.value)}
        />
      </div>

      {/* Address toggle */}
      <div className="cm-field">
        <label className="cm-label">
          <input
            type="checkbox"
            checked={hasAddress}
            onChange={(e) => {
              const checked = e.target.checked;
              setHasAddress(checked);

              if (!checked) {
                update("address_street", null);
                update("address_city", null);
                update("address_state", null);
                update("address_zip", null);
                update("address_country", null);
              }
            }}
          />
          &nbsp;Has Address
        </label>
      </div>

      {hasAddress &&
        ["street", "city", "state", "zip", "country"].map((field) => (
          <div className="cm-field" key={field}>
            <label className="cm-label">
              {field.charAt(0).toUpperCase() + field.slice(1)}
            </label>
            <input
              className="cm-input"
              value={record[`address_${field}`] || ""}
              onChange={(e) => update(`address_${field}`, e.target.value)}
            />
          </div>
        ))}

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