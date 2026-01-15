"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

export default function LocationForm({ record, onChange }) {
  const { campaign } = useCampaignContext();

  if (!campaign) {
    return <div className="cm-detail-empty">Select a Campaign</div>;
  }

  if (!record) {
    return <div className="cm-detail-empty">Select a Record</div>;
  }

  const update = (field, value) => {
    onChange({
      ...record,
      [field]: value,
      campaign_id: campaign.id,
    });
  };

  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1200);
    return () => clearTimeout(t);
  }, [record.id]);

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

  const canUseAI = useMemo(
    () => !!(record.id && campaign.id),
    [record.id, campaign.id]
  );

  return (
    <div className={`cm-detail-form ${pulse ? "pulse" : ""}`}>
      <div className="cm-field">
        <label>Name</label>
        <input
          className="cm-input"
          value={record.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>Description</label>
        <textarea
          className="cm-textarea"
          value={record.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label>
          <input
            type="checkbox"
            checked={hasAddress}
            onChange={(e) => {
              setHasAddress(e.target.checked);
              if (!e.target.checked) {
                ["street", "city", "state", "zip", "country"].forEach((f) =>
                  update(`address_${f}`, null)
                );
              }
            }}
          />
          &nbsp;Has Address
        </label>
      </div>

      {hasAddress &&
        ["street", "city", "state", "zip", "country"].map((f) => (
          <div className="cm-field" key={f}>
            <label>{f}</label>
            <input
              className="cm-input"
              value={record[`address_${f}`] || ""}
              onChange={(e) =>
                update(`address_${f}`, e.target.value)
              }
            />
          </div>
        ))}
    </div>
  );
}
