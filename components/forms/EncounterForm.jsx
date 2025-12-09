// components/forms/EncounterForm.jsx
"use client";

import React, { useEffect, useState } from "react";
import { cmApi } from "@/lib/cm/client";

export default function EncounterForm({ record, onChange }) {
  const [npcs, setNpcs] = useState([]);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [lore, setLore] = useState([]);
  const [types, setTypes] = useState([]);

  useEffect(() => {
    cmApi.list("npcs").then(setNpcs);
    cmApi.list("items").then(setItems);
    cmApi.list("locations").then(setLocations);
    cmApi.list("lore").then(setLore);
    cmApi.list("encounterTypes").then(setTypes).catch(() => setTypes([]));
  }, []);

  const update = (f, v) => onChange({ ...record, [f]: v });

  const toggle = (field, id) =>
    update(
      field,
      (record[field] || []).includes(id)
        ? record[field].filter((i) => i !== id)
        : [...(record[field] || []), id]
    );

  return (
    <div className="cm-detail-form">

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
        <label>Priority</label>
        <input
          type="number"
          value={record.priority || 0}
          onChange={(e) => update("priority", parseInt(e.target.value))}
        />
      </div>

      {/* NPCs */}
      <div className="cm-field">
        <label>NPCs</label>
        <div className="cm-multiselect">
          {npcs.map((npc) => (
            <div
              key={npc.id}
              className={
                (record.npcIds || []).includes(npc.id)
                  ? "ms-item selected"
                  : "ms-item"
              }
              onClick={() => toggle("npcIds", npc.id)}
            >
              {npc.firstName} {npc.lastName}
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="cm-field">
        <label>Items</label>
        <div className="cm-multiselect">
          {items.map((it) => (
            <div
              key={it.id}
              className={
                (record.itemIds || []).includes(it.id)
                  ? "ms-item selected"
                  : "ms-item"
              }
              onClick={() => toggle("itemIds", it.id)}
            >
              {it.description}
            </div>
          ))}
        </div>
      </div>

      {/* Locations */}
      <div className="cm-field">
        <label>Locations</label>
        <div className="cm-multiselect">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className={
                (record.locationIds || []).includes(loc.id)
                  ? "ms-item selected"
                  : "ms-item"
              }
              onClick={() => toggle("locationIds", loc.id)}
            >
              {loc.description}
            </div>
          ))}
        </div>
      </div>

      {/* Lore */}
      <div className="cm-field">
        <label>Lore</label>
        <div className="cm-multiselect">
          {lore.map((lr) => (
            <div
              key={lr.id}
              className={
                (record.loreIds || []).includes(lr.id)
                  ? "ms-item selected"
                  : "ms-item"
              }
              onClick={() => toggle("loreIds", lr.id)}
            >
              {lr.description}
            </div>
          ))}
        </div>
      </div>

      {/* Types */}
      {types.length > 0 && (
        <div className="cm-field">
          <label>Encounter Types</label>
          <div className="cm-multiselect">
            {types.map((t) => (
              <div
                key={t.id}
                className={
                  (record.typeIds || []).includes(t.id)
                    ? "ms-item selected"
                    : "ms-item"
                }
                onClick={() => toggle("typeIds", t.id)}
              >
                {t.name}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
