"use client";

import React, { useEffect, useState } from "react";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

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
