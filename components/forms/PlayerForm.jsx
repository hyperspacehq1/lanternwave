"use client";

import React, { useEffect, useState } from "react";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

export default function PlayerForm({ record, onChange }) {
  const { campaign } = useCampaignContext();

  /* ---------------------------------------------
     Guards (MATCH ItemForm)
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
        <h3>No Player Selected</h3>
        <p>Select a player or create a new one.</p>
      </div>
    );
  }

  const isNewPlayer = record._isNew;

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
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [record.id]);

  const nameInvalid = !record.name?.trim();

  /* ---------------------------------------------
     Render
  --------------------------------------------- */
  return (
    <div className="cm-detail-form">
      {/* Header (MATCH ItemForm) */}
      <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
        <div className="cm-context-line">
          <strong>Campaign:</strong> {campaign.name}
        </div>
        <div className="cm-context-line">
          <strong>Player:</strong>{" "}
          {isNewPlayer
            ? "New Player"
            : record.character_name || record.name || "Unnamed Player"}
        </div>
      </div>

      {/* First Name (maps to `name`) */}
      <div className="cm-field" data-required data-invalid={nameInvalid}>
        <label className="cm-label">
          First Name <span style={{ color: "red" }}>(Required)</span>
        </label>
        <input
          className="cm-input"
          value={record.name || ""}
          onChange={(e) => update("name", e.target.value)}
          style={{
            borderColor: nameInvalid ? "red" : undefined,
          }}
        />
      </div>

      {/* Last Name */}
      <div className="cm-field">
        <label className="cm-label">Last Name</label>
        <input
          className="cm-input"
          value={record.last_name || ""}
          onChange={(e) => update("last_name", e.target.value)}
        />
      </div>

      {/* Character Name */}
      <div className="cm-field">
        <label className="cm-label">Character Name</label>
        <input
          className="cm-input"
          value={record.character_name || ""}
          onChange={(e) => update("character_name", e.target.value)}
        />
      </div>

      {/* Sanity (Base) */}
      <div className="cm-field">
        <label className="cm-label">Sanity (Base)</label>
        <input
          type="number"
          className="cm-input"
          min={0}
          max={99}
          value={Number.isInteger(record.sanity) ? record.sanity : ""}
          onChange={(e) =>
            update(
              "sanity",
              e.target.value === "" ? null : Number(e.target.value)
            )
          }
        />
        <div className="cm-field-help">
          Base SAN used to calculate starting and percentage thresholds.
        </div>
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

      {/* Phone */}
      <div className="cm-field">
        <label className="cm-label">Phone</label>
        <input
          className="cm-input"
          value={record.phone || ""}
          onChange={(e) => update("phone", e.target.value)}
        />
      </div>

      {/* Email */}
      <div className="cm-field">
        <label className="cm-label">Email</label>
        <input
          type="email"
          className="cm-input"
          value={record.email || ""}
          onChange={(e) => update("email", e.target.value)}
        />
      </div>

      {/* Initiative Score */}
      <div className="cm-field">
        <label className="cm-label">Initiative Score</label>
        <input
          type="number"
          className="cm-input"
          value={
            Number.isInteger(record.initiative_score)
              ? record.initiative_score
              : ""
          }
          onChange={(e) =>
            update(
              "initiative_score",
              e.target.value === "" ? null : Number(e.target.value)
            )
          }
        />
      </div>

      {/* Initiative Bonus */}
      <div className="cm-field">
        <label className="cm-label">Initiative Bonus</label>
        <input
          type="number"
          className="cm-input"
          value={
            Number.isInteger(record.initiative_bonus)
              ? record.initiative_bonus
              : ""
          }
          onChange={(e) =>
            update(
              "initiative_bonus",
              e.target.value === "" ? null : Number(e.target.value)
            )
          }
        />
      </div>
    </div>
  );
}
