import React, { useState, useEffect } from "react";
import {
  listCampaigns,
  createCampaign,
  listSessions,
  createSession,
  listSessionPlayers,
  addSessionPlayer,
  removeSessionPlayer,
  listSessionMessages,
  listEvents,
  createEvent,
  listNPCs,
  createNPC,
  assignNPCToMission,
  updateNPCState,
} from "../lib/mission-api";

import "./mission-manager.css";

export default function MissionManagerPage() {
  // ------------------------------
  // CAMPAIGN + SESSION STATE
  // ------------------------------
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(
    () => JSON.parse(localStorage.getItem("mm_selectedCampaign")) || null
  );

  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(
    () => JSON.parse(localStorage.getItem("mm_selectedSession")) || null
  );

  const [newCampaignName, setNewCampaignName] = useState("");
  const [newSessionName, setNewSessionName] = useState("");

  // ------------------------------
  // EVENTS / MESSAGES
  // ------------------------------
  const [events, setEvents] = useState([]);
  const [newEventText, setNewEventText] = useState("");

  const [messages, setMessages] = useState([]);

  // ------------------------------
  // PLAYERS
  // ------------------------------
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");

  // ------------------------------
  // NPCs + NPC STATE
  // ------------------------------
  const [npcList, setNpcList] = useState([]);
  const [npcState, setNpcState] = useState([]);

  // NPC form state
  const [newNpcDisplayName, setNewNpcDisplayName] = useState("");
  const [newNpcTrueName, setNewNpcTrueName] = useState("");
  const [newNpcPublicDesc, setNewNpcPublicDesc] = useState("");

  // *** Newly required advanced NPC fields ***
  const [newNpcPrimaryCategory, setNewNpcPrimaryCategory] = useState("");
  const [newNpcSecondarySubtype, setNewNpcSecondarySubtype] = useState("");
  const [newNpcIntent, setNewNpcIntent] = useState("");
  const [newNpcSecretDesc, setNewNpcSecretDesc] = useState("");
  const [newNpcGoalsText, setNewNpcGoalsText] = useState("");
  const [newNpcSecretsText, setNewNpcSecretsText] = useState("");
  const [newNpcNotes, setNewNpcNotes] = useState("");

  // JSON import for NPC
  const [npcImportText, setNpcImportText] = useState("");

  // ------------------------------
  // UI PANEL TABS
  // ------------------------------
  const [activeRightTab, setActiveRightTab] = useState("events");

  // ------------------------------
  // INITIAL LOAD
  // ------------------------------
  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    const data = await listCampaigns();
    setCampaigns(data);
  }

  // ------------------------------
  // LOAD SESSIONS WHEN CAMPAIGN CHANGES
  // ------------------------------
  useEffect(() => {
    if (!selectedCampaign) return;
    localStorage.setItem("mm_selectedCampaign", JSON.stringify(selectedCampaign));
    loadSessions(selectedCampaign.id);
  }, [selectedCampaign]);

  async function loadSessions(campaignId) {
    const items = await listSessions(campaignId);
    setSessions(items);
  }

  // ------------------------------
  // LOAD SESSION-RELATED DATA
  // ------------------------------
  useEffect(() => {
    if (!selectedSession) return;

    localStorage.setItem("mm_selectedSession", JSON.stringify(selectedSession));

    loadPlayers(selectedSession.id);
    loadMessages(selectedSession.id);
    loadEvents(selectedSession.mission_id);
    loadNPCsGlobal();
    loadNPCSessionState(selectedSession.id);
  }, [selectedSession]);

  async function loadPlayers(sessionId) {
    const p = await listSessionPlayers(sessionId);
    setPlayers(p || []);
  }

  async function loadMessages(sessionId) {
    const m = await listSessionMessages(sessionId);
    setMessages(m || []);
  }

  async function loadEvents(missionId) {
    if (!missionId) return;
    const ev = await listEvents(missionId);
    setEvents(ev || []);
  }

  async function loadNPCsGlobal() {
    const n = await listNPCs();
    setNpcList(n || []);
  }

  async function loadNPCSessionState(sessionId) {
    const state = await updateNPCState("GET", sessionId);
    setNpcState(state || []);
  }

  // ------------------------------
  // CREATE CAMPAIGN
  // ------------------------------
  async function handleCreateCampaign() {
    if (!newCampaignName.trim()) return;
    await createCampaign(newCampaignName.trim());
    setNewCampaignName("");
    await loadCampaigns();
  }

  // ------------------------------
  // CREATE SESSION
  // ------------------------------
  async function handleCreateSession() {
    if (!selectedCampaign || !newSessionName.trim()) return;
    await createSession(selectedCampaign.id, newSessionName.trim());
    setNewSessionName("");
    await loadSessions(selectedCampaign.id);
  }

  // ------------------------------
  // CREATE EVENT
  // ------------------------------
  async function handleCreateEvent() {
    if (!selectedSession || !newEventText.trim()) return;
    await createEvent(selectedSession.mission_id, newEventText.trim());
    setNewEventText("");
    await loadEvents(selectedSession.mission_id);
  }

  // ------------------------------
  // PLAYER ADD / REMOVE
  // ------------------------------
  async function handleAddPlayer() {
    if (!selectedSession || !newPlayerName.trim() || !newPlayerNumber.trim()) return;

    await addSessionPlayer(
      selectedSession.id,
      newPlayerName.trim(),
      newPlayerNumber.trim()
    );

    setNewPlayerName("");
    setNewPlayerNumber("");
    await loadPlayers(selectedSession.id);
  }

  async function handleRemovePlayer(id) {
    await removeSessionPlayer(id);
    if (selectedSession) loadPlayers(selectedSession.id);
  }

  // --------------------------------------------------------
  // FINAL NPC CREATION PATCH (FULLY SAFE, DB-COMPATIBLE)
  // --------------------------------------------------------
  async function handleCreateNPC(npcOverride = null) {
    const payload = npcOverride || {
      display_name: newNpcDisplayName.trim(),
      true_name: newNpcTrueName.trim(),
      primary_category: newNpcPrimaryCategory || "Unspecified",
      secondary_subtype: newNpcSecondarySubtype || null,
      intent: newNpcIntent || null,
      description_public: newNpcPublicDesc || null,
      description_secret: newNpcSecretDesc || null,
      goals_text: newNpcGoalsText || null,
      secrets_text: newNpcSecretsText || null,
      notes: newNpcNotes || null,
    };

    if (!payload.display_name || !payload.true_name) return;
    if (!payload.primary_category) payload.primary_category = "Unspecified";

    await createNPC(payload);

    // Reset fields
    setNewNpcDisplayName("");
    setNewNpcTrueName("");
    setNewNpcPrimaryCategory("");
    setNewNpcSecondarySubtype("");
    setNewNpcIntent("");
    setNewNpcPublicDesc("");
    setNewNpcSecretDesc("");
    setNewNpcGoalsText("");
    setNewNpcSecretsText("");
    setNewNpcNotes("");
    setNpcImportText("");

    await loadNPCsGlobal();
  }

  // Import NPC via JSON
  async function handleImportNPC() {
    try {
      const json = JSON.parse(npcImportText);
      await handleCreateNPC(json);
    } catch (err) {
      console.error("Invalid NPC JSON", err);
    }
  }

  // ------------------------------------------------------
  // UI RENDER
  // ------------------------------------------------------
  return (
    <div className="mm-container">
      {/* -------------------------------- */}
      {/* LEFT PANEL — CAMPAIGNS & SESSIONS */}
      {/* -------------------------------- */}
      <div className="mm-left">
        <div className="mm-section-title">Campaigns</div>

        <div className="mm-list">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className={`mm-list-item ${
                selectedCampaign?.id === c.id ? "selected" : ""
              }`}
              onClick={() => setSelectedCampaign(c)}
            >
              {c.name}
            </div>
          ))}
        </div>

        <input
          className="mm-input"
          placeholder="New Campaign"
          value={newCampaignName}
          onChange={(e) => setNewCampaignName(e.target.value)}
        />
        <button className="mm-btn" onClick={handleCreateCampaign}>
          Add Campaign
        </button>

        {/* SESSIONS */}
        {selectedCampaign && (
          <>
            <div className="mm-section-title mt20">Sessions</div>

            <div className="mm-list">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={`mm-list-item ${
                    selectedSession?.id === s.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedSession(s)}
                >
                  {s.session_name}
                </div>
              ))}
            </div>

            <input
              className="mm-input"
              placeholder="New Session"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
            />

            <button className="mm-btn" onClick={handleCreateSession}>
              Add Session
            </button>
          </>
        )}
      </div>

      {/* -------------------------------- */}
      {/* MIDDLE PANEL — EVENTS / MESSAGES */}
      {/* -------------------------------- */}
      <div className="mm-middle">
        <div className="mm-section-title">
          {selectedSession
            ? `Session: ${selectedSession.session_name}`
            : "Select a session"}
        </div>

        {/* Tabs */}
        <div className="mm-tabs">
          <div
            className={`mm-tab ${
              activeRightTab === "events" ? "active" : ""
            }`}
            onClick={() => setActiveRightTab("events")}
          >
            Events
          </div>

          <div
            className={`mm-tab ${
              activeRightTab === "messages" ? "active" : ""
            }`}
            onClick={() => setActiveRightTab("messages")}
          >
            Messages
          </div>

          <div
            className={`mm-tab ${
              activeRightTab === "npcs" ? "active" : ""
            }`}
            onClick={() => setActiveRightTab("npcs")}
          >
            NPCs
          </div>

          <div
            className={`mm-tab ${
              activeRightTab === "players" ? "active" : ""
            }`}
            onClick={() => setActiveRightTab("players")}
          >
            Players
          </div>
        </div>

        {/* ------------------------- */}
        {/* EVENTS LIST */}
        {/* ------------------------- */}
        {activeRightTab === "events" && (
          <>
            <div className="mm-list tall">
              {events.map((ev) => (
                <div key={ev.id} className="mm-list-item">
                  {ev.body}
                </div>
              ))}
            </div>

            <textarea
              className="mm-input"
              placeholder="New event..."
              value={newEventText}
              onChange={(e) => setNewEventText(e.target.value)}
            />

            <button className="mm-btn" onClick={handleCreateEvent}>
              Add Event
            </button>
          </>
        )}

        {/* ------------------------- */}
        {/* MESSAGES LIST */}
        {/* ------------------------- */}
        {activeRightTab === "messages" && (
          <div className="mm-list tall">
            {messages.map((m, idx) => (
              <div key={idx} className="mm-list-item">
                {m.body}
              </div>
            ))}
          </div>
        )}

        {/* ------------------------- */}
        {/* NPCS UI — FINAL PATCH */}
        {/* ------------------------- */}
        {activeRightTab === "npcs" && (
          <>
            <div className="mm-footer-title">Create NPC</div>

            <input
              className="mm-input"
              placeholder="NPC Display Name (required)"
              value={newNpcDisplayName}
              onChange={(e) => setNewNpcDisplayName(e.target.value)}
            />

            <input
              className="mm-input"
              placeholder="NPC True Name (required)"
              value={newNpcTrueName}
              onChange={(e) => setNewNpcTrueName(e.target.value)}
            />

            <select
              className="mm-input"
              value={newNpcPrimaryCategory}
              onChange={(e) => setNewNpcPrimaryCategory(e.target.value)}
            >
              <option value="">Primary Category</option>
              <option>Civilian</option>
              <option>Law Enforcement</option>
              <option>Military</option>
              <option>Criminal</option>
              <option>Government / Bureaucracy</option>
              <option>Medical / Scientific</option>
              <option>Occultist / Cultist</option>
              <option>Friendly Asset</option>
              <option>Unfriendly Asset</option>
              <option>Mythos (Human)</option>
              <option>Mythos (Entity / Creature)</option>
            </select>

            <input
              className="mm-input"
              placeholder="Secondary Subtype"
              value={newNpcSecondarySubtype}
              onChange={(e) => setNewNpcSecondarySubtype(e.target.value)}
            />

            <input
              className="mm-input"
              placeholder="Intent / Motivation"
              value={newNpcIntent}
              onChange={(e) => setNewNpcIntent(e.target.value)}
            />

            <textarea
              className="mm-input mm-textarea"
              placeholder="Public Description"
              rows={2}
              value={newNpcPublicDesc}
              onChange={(e) => setNewNpcPublicDesc(e.target.value)}
            />

            <textarea
              className="mm-input mm-textarea"
              placeholder="Secret Description"
              rows={2}
              value={newNpcSecretDesc}
              onChange={(e) => setNewNpcSecretDesc(e.target.value)}
            />

            <textarea
              className="mm-input mm-textarea"
              placeholder="Goals / Objectives"
              rows={2}
              value={newNpcGoalsText}
              onChange={(e) => setNewNpcGoalsText(e.target.value)}
            />

            <textarea
              className="mm-input mm-textarea"
              placeholder="Secrets"
              rows={2}
              value={newNpcSecretsText}
              onChange={(e) => setNewNpcSecretsText(e.target.value)}
            />

            <textarea
              className="mm-input mm-textarea"
              placeholder="Notes"
              rows={2}
              value={newNpcNotes}
              onChange={(e) => setNewNpcNotes(e.target.value)}
            />

            <button className="mm-btn" onClick={() => handleCreateNPC()}>
              Add NPC
            </button>

            <div className="mm-footer-title">Import NPC (JSON)</div>

            <textarea
              className="mm-input mm-textarea"
              placeholder="Paste NPC JSON"
              rows={3}
              value={npcImportText}
              onChange={(e) => setNpcImportText(e.target.value)}
            />

            <button className="mm-btn" onClick={handleImportNPC}>
              Import NPC
            </button>

            {/* NPC LIST DISPLAY */}
            <div className="mm-section-title mt20">NPC List</div>
            <div className="mm-list tall">
              {npcList.map((n) => (
                <div key={n.id} className="mm-list-item">
                  {n.display_name} — {n.primary_category}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ------------------------- */}
        {/* PLAYERS UI */}
        {/* ------------------------- */}
        {activeRightTab === "players" && (
          <>
            <div className="mm-footer-title">Add Player</div>

            <input
              className="mm-input"
              placeholder="Player Name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
            />

            <input
              className="mm-input"
              placeholder="Phone Number"
              value={newPlayerNumber}
              onChange={(e) => setNewPlayerNumber(e.target.value)}
            />

            <button className="mm-btn" onClick={handleAddPlayer}>
              Add Player
            </button>

            <div className="mm-list tall">
              {players.map((p) => (
                <div key={p.id} className="mm-list-item">
                  {p.player_name} — {p.phone_number}
                  <button
                    className="mm-small-btn"
                    onClick={() => handleRemovePlayer(p.id)}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
