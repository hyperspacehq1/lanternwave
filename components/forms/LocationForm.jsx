"use client";

import React, { useState, useEffect } from "react";

export default function LocationForm({ record, onChange }) {
  if (!record) return null;

  const update = (field, value) =>
    onChange({ ...record, [field]: value });

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

      <div className="cm-field">
        <label>
          Name <strong>(required)</strong>
        </label>
        <input
          type="text"
          value={record.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>World</label>
        <input
          type="text"
          value={record.world || ""}
          onChange={(e) => update("world", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Description</label>
        <textarea
          value={record.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Notes</label>
        <textarea
          value={record.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Sensory</label>
        <textarea
          value={record.sensory || ""}
          onChange={(e) => update("sensory", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>
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
            <label>Street</label>
            <input
              type="text"
              value={record.address_street || ""}
              onChange={(e) => update("address_street", e.target.value)}
            />
          </div>

          <div className="cm-field">
            <label>City</label>
            <input
              type="text"
              value={record.address_city || ""}
              onChange={(e) => update("address_city", e.target.value)}
            />
          </div>

          <div className="cm-field">
            <label>State</label>
            <input
              type="text"
              value={record.address_state || ""}
              onChange={(e) => update("address_state", e.target.value)}
            />
          </div>

          <div className="cm-field">
            <label>Zip</label>
            <input
              type="text"
              value={record.address_zip || ""}
              onChange={(e) => update("address_zip", e.target.value)}
            />
          </div>

          <div className="cm-field">
            <label>Country</label>
            <input
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
