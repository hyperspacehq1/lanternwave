"use client";

import React, { useState, useEffect } from "react";

export default function LocationForm({ record, onChange }) {
  if (!record) return null;

  const update = (field, value) =>
    onChange({ ...record, [field]: value });

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

  return (
    <div className="cm-detail-form">

      {/* 🔒 Locked campaign header */}
      <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
        Campaign: {record._campaignName || "Unnamed Campaign"}
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

      <div className="cm-field">
        <label className="cm-label">Sensory</label>
        <textarea
          className="cm-textarea"
          value={record.sensory || ""}
          onChange={(e) => update("sensory", e.target.value)}
        />
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
