"use client";

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { cmApi, getAdminKey, setAdminKey } from "@/lib/cm/client";
import { getFormComponent } from "@/components/forms";

import Header from "@/components/Header"; // TOP NAV USED BY CONTROLLER & PLAYER
import "./campaignManager.css";

export default function CampaignManagerPage() {
  const containers = [
    "campaigns",
    "sessions",
    "events",
    "player_characters",
    "npcs",
    "encounters",
    "quests",
    "locations",
    "items",
    "lore",
    "logs",
  ];

  const [adminKey, setAdminKeyState] = useState("");
  const [activeContainer, setActiveContainer] = useState("campaigns");
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saveStatus, setSaveStatus] = useState("Idle");

  // ------------------------------------------------------------
  // Load Admin Key
  // ------------------------------------------------------------
  useEffect(() => {
    const stored = getAdminKey();
    if (stored) setAdminKeyState(stored);
  }, []);

  // ------------------------------------------------------------
  // Fetch records on container change
  // ------------------------------------------------------------
  useEffect(() => {
    if (!adminKey) return;

    async function load() {
      const rows = await cmApi(adminKey).list(activeContainer);
      setRecords(rows);
      setSelected(null);
    }

    load();
  }, [activeContainer, adminKey]);

  // ------------------------------------------------------------
  // Save Key
  // ------------------------------------------------------------
  const handleSaveKey = () => {
    setAdminKey(adminKey);
  };

  // ------------------------------------------------------------
  // NEW RECORD
  // ------------------------------------------------------------
  const handleNew = () => {
    const id = uuidv4();
    setSelected({
      id,
      name: "",
      _isNew: true,
    });
  };

  // ------------------------------------------------------------
  // SAVE RECORD
  // ------------------------------------------------------------
  const handleSave = async () => {
    if (!selected) return;
    setSaveStatus("Saving...");
    await cmApi(adminKey).upsert(activeContainer, selected.id, selected);
    setSaveStatus("Saved");

    // Refresh list
    const rows = await cmApi(adminKey).list(activeContainer);
    setRecords(rows);
  };

  // ------------------------------------------------------------
  // DELETE RECORD
  // ------------------------------------------------------------
  const handleDelete = async () => {
    if (!selected) return;

    await cmApi(adminKey).remove(activeContainer, selected.id);
    setSelected(null);

    const rows = await cmApi(adminKey).list(activeContainer);
    setRecords(rows);
  };

  // ------------------------------------------------------------
  // FORM COMPONENT
  // ------------------------------------------------------------
  const FormComponent = getFormComponent(activeContainer);

  return (
    <>
      {/* CONTROLLER/PLAYER/CAMPAIGN-MANAGER TOP NAV */}
      <Header active="campaign" />

      <div className="cm-root">
        {/* ------------------------------------------------------ */}
        {/* SIDEBAR                                               */}
        {/* ------------------------------------------------------ */}
        <div className="cm-sidebar">
          <div className="cm-sidebar-title">CAMPAIGN MANAGER</div>

          {/* API KEY */}
          <div className="cm-heading">Admin API Key</div>
          <input
            className="cm-input"
            value={adminKey}
            onChange={(e) => setAdminKeyState(e.target.value)}
            placeholder="Enter Admin API Key"
            type="password"
          />
          <button className="cm-button" onClick={handleSaveKey}>
            Save Key
          </button>

          {/* CONTAINER LIST */}
          <div className="cm-heading">Sections</div>

          <div className="cm-container-list">
            {containers.map((c) => (
              <button
                key={c}
                className={`cm-container-btn ${
                  activeContainer === c ? "active" : ""
                }`}
                onClick={() => setActiveContainer(c)}
              >
                {c
                  .replace("_", " ")
                  .replace(/\b\w/g, (ch) => ch.toUpperCase())}
              </button>
            ))}
          </div>

          {/* SAVE STATUS */}
          <div className="cm-save-status">Status: {saveStatus}</div>
        </div>

        {/* ------------------------------------------------------ */}
        {/* MAIN PANEL                                            */}
        {/* ------------------------------------------------------ */}
        <div className="cm-main">
          <div className="cm-main-header">
            <h2 className="cm-main-title">
              {activeContainer.replace("_", " ")}
            </h2>

            <div className="cm-main-actions">
              <button className="cm-button" onClick={handleNew}>
                + New
              </button>
              <button className="cm-button" onClick={handleSave}>
                Save
              </button>
              {selected && (
                <button className="cm-button danger" onClick={handleDelete}>
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* SPLIT: LEFT LIST + RIGHT DETAIL */}
          <div className="cm-content">
            {/* LEFT LIST */}
            <div className="cm-list">
              {records.length === 0 ? (
                <div className="cm-list-empty">No records yet.</div>
              ) : (
                records.map((r) => (
                  <div
                    key={r.id}
                    className={`cm-list-item ${
                      selected?.id === r.id ? "selected" : ""
                    }`}
                    onClick={() => setSelected(r)}
                  >
                    <div className="cm-list-title">
                      {r.name || "(No title)"}
                    </div>
                    <div className="cm-list-sub">{r.id}</div>
                  </div>
                ))
              )}
            </div>

            {/* RIGHT DETAIL FORM */}
            <div className="cm-detail">
              {!selected ? (
                <div className="cm-detail-empty">
                  Select or create a record.
                </div>
              ) : (
                <div className="cm-detail-inner">
                  <FormComponent value={selected} onChange={setSelected} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
