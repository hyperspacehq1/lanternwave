"use client";

import React, { useState, useEffect, useMemo } from "react";
import { withContext } from "@/lib/forms/withContext";

export default function LocationForm({ record, campaignName }) {
  if (!record) return null;

const update = (field, value) => {
  onChange(
    withContext(
      {
        ...record,
        [field]: value,
      },
      {
        campaign_id: record.campaign_id,
        session_id: record.session_id,
      }
    )
  );
};


  /* ---------------------------------------------
     Campaign change pulse
  --------------------------------------------- */
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1200);
    return () => clearTimeout(t);
  }, [record._campaignName]);

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
     Sensory AI helpers
  --------------------------------------------- */
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const canUseAI = useMemo(() => {
    return !!(record.id && record.campaign_id && record._campaignName);
  }, [record.id, record.campaign_id, record._campaignName]);

  function sensoryToTextareaValue(sensory) {
    if (sensory == null || sensory === "") return "";

    if (typeof sensory === "object") {
      if (sensory.hear != null || sensory.smell != null) {
        const hear = (sensory.hear || "").trim();
        const smell = (sensory.smell || "").trim();
        return `Hear:\n${hear}\n\nSmell:\n${smell}`.trim();
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

  async function generateSensory() {
    setAiError("");

    if (!canUseAI) {
      setAiError("Select a campaign and location first.");
      return;
    }

    setAiLoading(true);

    try {
      /* -----------------------------
         1) Generate via AI
      ------------------------------ */
      const res = await fetch("/api/ai/locations/sensory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: record.id,
          campaign_id: record.campaign_id,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAiError(data?.error || "AI generation failed.");
        return;
      }

      if (!data?.sensory) {
        setAiError("AI returned no sensory content.");
        return;
      }

      /* -----------------------------
         2) Auto-save immediately
      ------------------------------ */
     const saveRes = await fetch(`/api/locations?id=${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sensory: data.sensory,
        }),
      });

      const saved = await saveRes.json().catch(() => null);

      if (!saveRes.ok || !saved) {
        setAiError("Generated sensory, but failed to save.");
        return;
      }

      /* -----------------------------
         3) Update UI from DB state
      ------------------------------ */
      update("sensory", saved.sensory);
    } catch (e) {
      setAiError(String(e?.message || e));
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="cm-detail-form">

     <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
  <div className="cm-context-line">
    Campaign: {campaignName || "Unnamed Campaign"}
  </div>

  <div className="cm-context-line">
    Session: {record.name || "Unnamed Session"}
  </div>
</div>

      <div className="cm-field">
        <label className="cm-label">
          Name <strong>(required)</strong>
        </label>
        <input
          className="cm-input"
          type="text"
          value={record.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">World</label>
        <input
          className="cm-input"
          type="text"
          value={record.world || ""}
          onChange={(e) => update("world", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Description</label>
        <textarea
          className="cm-textarea"
          value={record.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Notes</label>
        <textarea
          className="cm-textarea"
          value={record.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>

      {/* Sensory + AI button */}
      <div className="cm-field">
        <label
          className="cm-label"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <span>Sensory</span>

          <button
            type="button"
            onClick={generateSensory}
            disabled={!canUseAI || aiLoading}
            title={
              !canUseAI
                ? "Select a campaign and location first"
                : "Generate sensory details with AI"
            }
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid #2d8cff",
              background: "rgba(0,0,0,0.65)",
              color: "#2d8cff",
              cursor: !canUseAI || aiLoading ? "not-allowed" : "pointer",
              opacity: !canUseAI || aiLoading ? 0.6 : 1,
              fontSize: 12,
              lineHeight: "12px",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 16,
                height: 16,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                border: "1px solid #2d8cff",
              }}
            >
              {aiLoading ? "…" : "AI"}
            </span>
            {aiLoading ? "Generating" : "Generate"}
          </button>
        </label>

        <textarea
          className="cm-textarea"
          value={sensoryToTextareaValue(record.sensory)}
          onChange={(e) => update("sensory", e.target.value)}
          style={{
            borderColor: "#2d8cff",
            outlineColor: "#2d8cff",
          }}
        />

        {!!aiError && (
          <div style={{ marginTop: 8, color: "#2d8cff", fontSize: 12 }}>
            {aiError}
          </div>
        )}
      </div>

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

      {hasAddress && (
        <>
          <div className="cm-field">
            <label className="cm-label">Street</label>
            <input
              className="cm-input"
              type="text"
              value={record.address_street || ""}
              onChange={(e) => update("address_street", e.target.value)}
            />
          </div>

          <div className="cm-field">
            <label className="cm-label">City</label>
            <input
              className="cm-input"
              type="text"
              value={record.address_city || ""}
              onChange={(e) => update("address_city", e.target.value)}
            />
          </div>

          <div className="cm-field">
            <label className="cm-label">State</label>
            <input
              className="cm-input"
              type="text"
              value={record.address_state || ""}
              onChange={(e) => update("address_state", e.target.value)}
            />
          </div>

          <div className="cm-field">
            <label className="cm-label">Zip</label>
            <input
              className="cm-input"
              type="text"
              value={record.address_zip || ""}
              onChange={(e) => update("address_zip", e.target.value)}
            />
          </div>

          <div className="cm-field">
            <label className="cm-label">Country</label>
            <input
              className="cm-input"
              type="text"
              value={record.address_country || ""}
              onChange={(e) => update("address_country", e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  );
}
