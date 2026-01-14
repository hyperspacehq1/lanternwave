"use client";

import React, { useEffect, useMemo, useState } from "react";
import { withContext } from "@/lib/forms/withContext";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

export default function LocationForm({ record, onChange }) {
  const { campaign } = useCampaignContext();

  /* ---------------------------------------------
     Guards
  --------------------------------------------- */
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
     Campaign pulse
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
     Sensory AI helpers
  --------------------------------------------- */
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const canUseAI = useMemo(() => {
    return !!(record.id && campaign.id);
  }, [record.id, campaign.id]);

  function sensoryToTextareaValue(sensory) {
    if (!sensory) return "";

    if (typeof sensory === "object") {
      if (sensory.hear || sensory.smell) {
        return `Hear:\n${sensory.hear || ""}\n\nSmell:\n${sensory.smell || ""}`;
      }
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
      setAiError("Save the location first.");
      return;
    }

    setAiLoading(true);

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

      update("sensory", data.sensory);
    } catch (e) {
      setAiError(String(e?.message || e));
    } finally {
      setAiLoading(false);
    }
  }

  /* ---------------------------------------------
     Render
  --------------------------------------------- */
  return (
    <div className={`cm-detail-form ${pulse ? "pulse" : ""}`}>
      <div className="cm-field">
        <label className="cm-label">Name *</label>
        <input
          className="cm-input"
          value={record.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">World</label>
        <input
          className="cm-input"
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

      {/* Sensory + AI */}
      <div className="cm-field">
        <label className="cm-label" style={{ display: "flex", gap: 10 }}>
          Sensory
          <button
            type="button"
            onClick={generateSensory}
            disabled={!canUseAI || aiLoading}
            style={{ marginLeft: "auto" }}
          >
            {aiLoading ? "Generating…" : "Generate AI"}
          </button>
        </label>

        <textarea
          className="cm-textarea"
          value={sensoryToTextareaValue(record.sensory)}
          onChange={(e) => update("sensory", e.target.value)}
        />

        {!!aiError && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#2d8cff" }}>
            {aiError}
          </div>
        )}
      </div>

      {/* Address */}
      <div className="cm-field">
        <label className="cm-label">
          <input
            type="checkbox"
            checked={hasAddress}
            onChange={(e) => {
              const checked = e.target.checked;
              setHasAddress(checked);
              if (!checked) {
                [
                  "street",
                  "city",
                  "state",
                  "zip",
                  "country",
                ].forEach((f) => update(`address_${f}`, null));
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
              onChange={(e) =>
                update(`address_${field}`, e.target.value)
              }
            />
          </div>
        ))}
    </div>
  );
}
