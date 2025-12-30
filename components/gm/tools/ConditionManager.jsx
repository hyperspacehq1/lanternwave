"use client";

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import "./conditions.css";
import { cmApi } from "@/lib/cm/client";

export default function ConditionManager() {
  const [players, setPlayers] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [templates, setTemplates] = useState([]);

  // Form fields
  const [targetId, setTargetId] = useState("");
  const [targetType, setTargetType] = useState("pc");
  const [conditionName, setConditionName] = useState("");
  const [severity, setSeverity] = useState("Mild");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  // Load initial data
  useEffect(() => {
    async function load() {
      const pcList = await cmApi.list("playerCharacters");
      const npcList = await cmApi.list("npcs");
      const condList = await cmApi.conditions.list();

      setPlayers(pcList || []);
      setNpcs(npcList || []);
      setConditions(condList || []);

      // If you add templates to DB:
      if (cmApi.conditionTemplates) {
        const tmpl = await cmApi.conditionTemplates.list();
        setTemplates(tmpl || []);
      }
    }
    load();
  }, []);

  // Build unified target list
  const targets = [
    ...players.map((p) => ({
      id: p.id,
      name: p.name || `${p.firstName || ""} ${p.lastName || ""}`,
      type: "pc",
    })),
    ...npcs.map((n) => ({
      id: n.id,
      name: n.name || `${n.firstName || ""} ${n.lastName || ""}`,
      type: "npc",
    })),
  ];

  const handleApplyTemplate = (templateId) => {
    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) return;

    setConditionName(tmpl.name);
    if (tmpl.defaultSeverity) setSeverity(tmpl.defaultSeverity);
    if (tmpl.defaultDuration) setDuration(tmpl.defaultDuration);
    if (tmpl.defaultNotes) setNotes(tmpl.defaultNotes);
  };

  // Add condition to DB
  const addCondition = async () => {
    if (!targetId || !conditionName.trim()) return;

    const entry = {
      id: uuidv4(),
      targetId,
      targetType,
      condition: conditionName,
      severity: severity || null,
      duration: duration || null,
      notes: notes || null,
    };

    const saved = await cmApi.conditions.create(entry);

    setConditions((prev) => [saved, ...prev]);

    // Reset form
    setTargetId("");
    setConditionName("");
    setSeverity("Mild");
    setDuration("");
    setNotes("");
  };

  const removeCondition = async (id) => {
    await cmApi.conditions.remove(id);
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  // Get display name for condition target
  const getTargetName = (entry) => {
    const t = targets.find((x) => x.id === entry.targetId);
    return t ? t.name : "Unknown Target";
  };

  return (
    <div className="cond-root">
      <h2 className="cond-title">Condition Manager</h2>

      {/* FORM TO ADD NEW CONDITION */}
      <div className="cond-form">
        <div className="cond-field">
          <label>Target Type</label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
          >
            <option value="pc">Player Character</option>
            <option value="npc">NPC</option>
          </select>
        </div>

        <div className="cond-field">
          <label>Target</label>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">Select {targetType.toUpperCase()}</option>
            {targets
              .filter((t) => t.type === targetType)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </div>

        <div className="cond-field">
          <label>Condition Name</label>
          <input
            type="text"
            value={conditionName}
            onChange={(e) => setConditionName(e.target.value)}
            placeholder="Bleeding, Frightened, Stunned…"
          />
        </div>

        {/* Optional template system */}
        {templates.length > 0 && (
          <div className="cond-field">
            <label>Apply Template</label>
            <select onChange={(e) => handleApplyTemplate(e.target.value)}>
              <option value="">Choose Template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="cond-field">
          <label>Severity</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            <option>Mild</option>
            <option>Moderate</option>
            <option>Severe</option>
            <option>Critical</option>
          </select>
        </div>

        <div className="cond-field">
          <label>Duration</label>
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="3 rounds, 10 minutes, Indefinite…"
          />
        </div>

        <div className="cond-field">
          <label>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe the penalty, narrative effect, etc."
          />
        </div>

        <button className="cond-add-btn" onClick={addCondition}>
          Add Condition
        </button>
      </div>

      {/* LIST OF CONDITIONS */}
      <div className="cond-list">
        {conditions.length === 0 && (
          <div className="cond-empty">No active conditions.</div>
        )}

        {conditions.map((c) => (
          <div key={c.id} className="cond-entry">
            <div className="cond-entry-header">
              <span className="cond-target">{getTargetName(c)}</span>
              <span className="cond-condition">{c.condition}</span>
              <span className="cond-severity">{c.severity}</span>

              <button
                className="cond-remove"
                onClick={() => removeCondition(c.id)}
              >
                ✕
              </button>
            </div>

            <div className="cond-meta">
              {c.duration && <div>Duration: {c.duration}</div>}
              {c.notes && <div className="cond-notes">{c.notes}</div>}
            </div>

            <div className="cond-timestamp">
              Added {new Date(c.createdAt || Date.now()).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
