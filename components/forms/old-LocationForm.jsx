"use client";

import React, { useEffect, useMemo, useState } from "react";
import { withContext } from "@/lib/forms/withContext";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

export default function LocationForm({ record, onChange }) {
  const { campaign, session } = useCampaignContext();

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

  if (!session) {
    return (
      <div className="cm-detail-empty">
        <h3>No Session Selected</h3>
        <p>Please select a session.</p>
      </div>
    );
  }

  if (!record) return null;

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
     Campaign pulse (restored)
  --------------------------------------------- */
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1200);
    return () => clearTimeout(t);
  }, [campaign.id]);

  /* ---------------------------------------------
     Address toggle (restored)
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
     Sensory AI helpers (restored)
  --------------------------------------------- */
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const canUseAI = useMemo(() => {
    return !!(record.id && campaign.id);
  }, [record.id, campaign.id]);

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

  async function generateSensory() {
    setAiError("");
    if (!canUseAI) {
      setAiError("Select a campaign and location first.");
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
      setAiLoading(false);
    }
  }

  /* ---------------------------------------------
     Render
  --------------------------------------------- */
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
          {["street", "city", "state", "zip", "country"].map((field) => (
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
        </>
      )}
    </div>
  );
}
