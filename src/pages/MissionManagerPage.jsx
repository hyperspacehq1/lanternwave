import React, { useState, useEffect } from "react";
import {
  listCampaigns,
  listSessions,
  createSession,
  listSessionPlayers,
  addSessionPlayer,
  removeSessionPlayer,
  archiveSessionEvent,
  listSessionMessages,
  listNPCs,
  getNPCState,
} from "../lib/mission-api";

// *** REQUIRED CSS IMPORT ***
import "./mission-manager.css";

export default function MissionManagerPage() {
  // --- STATE (unchanged) -----------------------------------------------------
  const [campaigns, setCampaigns] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [npcList, setNpcList] = useState([]);
  const [npcState, setNpcState] = useState(null);

  const [newSessionName, setNewSessionName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");

  // Tabs
  const [activeTimelineTab, setActiveTimelineTab] = useState("events");
  const [activeRightTab, setActiveRightTab] = useState("npcs");

  // --- LOAD CAMPAIGNS --------------------------------------------------------
  useEffect(() => {
    async function loadCampaigns() {
      const data = await listCampaigns();
      setCampaigns(data);
    }
    loadCampaigns();
  }, []);

  // --- HANDLERS --------------------------------------------------------------

  async function handleSelectCampaign(c) {
    setSelectedCampaign(c);

    // load sessions for this campaign
    const data = await listSessions(c.id);
    setSessions(data);

    // clear session-dependent data
    setSelectedSession(null);
    setPlayers([]);
    setMessages([]);
    setNpcList([]);
    setNpcState(null);
  }

  async function handleSelectSession(s) {
    setSelectedSession(s);

    // load players
    const p = await listSessionPlayers(s.id);
    setPlayers(p.players || []);

    // load messages
    const msg = await listSessionMessages(s.id);
    setMessages(msg || []);

    // load NPC list (global)
    const npcs = await listNPCs();
    setNpcList(npcs.npcs || []);

    // load state for first NPC if exists
    if ((npcs.npcs || []).length > 0) {
      const first = npcs.npcs[0];
      const st = await getNPCState(s.id, first.id);
      setNpcState(st || null);
    } else {
      setNpcState(null);
    }
  }

  async function handleCreateSession() {
    if (!selectedCampaign || !newSessionName.trim()) return;
    const newS = await createSession(selectedCampaign.id, newSessionName.trim());
    setSessions([...sessions, newS]);
    setNewSessionName("");
  }

  async function handleAddPlayer() {
    if (!selectedSession || !newPlayerNumber.trim()) return;
    await addSessionPlayer(selectedSession.id, newPlayerNumber.trim());
    const updated = await listSessionPlayers(selectedSession.id);
    setPlayers(updated.players || []);
    setNewPlayerNumber("");
  }

  async function handleRemovePlayer(num) {
    if (!selectedSession) return;
    await removeSessionPlayer(selectedSession.id, num);
    const updated = await listSessionPlayers(selectedSession.id);
    setPlayers(updated.players || []);
  }

  // EVENTS (list + archive)
  async function handleArchiveEvent(eventId) {
    if (!selectedSession) return;
    await archiveSessionEvent(selectedSession.id, eventId);
    const updated = await archiveSessionEvent(selectedSession.id, eventId);
  }

  // --- RENDER ----------------------------------------------------------------

  return (
    <div className="mission-manager">

      {/* TOP CONTEXT BAR ------------------------------------------------------ */}
      <header className="mm-header">
        <div className="mm-context">

          <div className="mm-context-left">
            <div className="mm-context-row">
              <span className="mm-context-label">Campaign:</span>
              <span className="mm-context-value">
                {selectedCampaign ? selectedCampaign.name : "None selected"}
              </span>
            </div>

            <div className="mm-context-row">
              <span className="mm-context-label">Session:</span>
              <span className="mm-context-value">
                {selectedSession ? selectedSession.session_name : "None selected"}
              </span>
            </div>
          </div>

          <div className="mm-context-right">
            <span className="mm-badge">Players: {players.length}</span>
            <span className="mm-badge">Messages: {messages.length}</span>
            <span className="mm-badge">NPCs: {npcList.length}</span>
          </div>

        </div>
      </header>

      {/* 2×2 GRID -------------------------------------------------------------- */}
      <div className="mm-grid">

        {/* PANEL 1: CAMPAIGNS -------------------------------------------------- */}
        <section className="mm-panel">
          <h2 className="mm-panel-title">Campaigns</h2>

          <div className="mm-panel-body">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className={`mm-item ${selectedCampaign?.id === c.id ? "selected" : ""}`}
                onClick={() => handleSelectCampaign(c)}
              >
                {c.name}
              </div>
            ))}
          </div>
        </section>

        {/* PANEL 2: SESSIONS --------------------------------------------------- */}
        <section className="mm-panel">
          <h2 className="mm-panel-title">Sessions</h2>

          <div className="mm-panel-body">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`mm-item ${selectedSession?.id === s.id ? "selected" : ""}`}
                onClick={() => handleSelectSession(s)}
              >
                {s.session_name}
              </div>
            ))}
          </div>

          <div className="mm-panel-footer">
            <input
              type="text"
              placeholder="New Session Name"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className="mm-input"
            />
            <button className="mm-btn" onClick={handleCreateSession}>
              Create Session
            </button>
          </div>
        </section>

        {/* PANEL 3: EVENTS / HOST MESSAGES (TABS) ----------------------------- */}
        <section className="mm-panel mm-panel-tall">
          <div className="mm-panel-header-with-tabs">
            <h2 className="mm-panel-title">Timeline</h2>

            <div className="mm-tabs">
              <button
                className={`mm-tab ${activeTimelineTab === "events" ? "active" : ""}`}
                onClick={() => setActiveTimelineTab("events")}
              >
                Events
              </button>
              <button
                className={`mm-tab ${activeTimelineTab === "messages" ? "active" : ""}`}
                onClick={() => setActiveTimelineTab("messages")}
              >
                Host Messages
              </button>
            </div>
          </div>

          <div className="mm-panel-body mm-scrollable">
            {activeTimelineTab === "events" && (
              <div>
                <div className="mm-placeholder">Your events list UI goes here</div>
              </div>
            )}

            {activeTimelineTab === "messages" && (
              <div>
                {messages.map((m, i) => (
                  <div key={i} className="mm-message-item">
                    <div className="mm-message-body">{m.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* PANEL 4: NPCS / PLAYERS (TABS) ------------------------------------- */}
        <section className="mm-panel mm-panel-tall">
          <div className="mm-panel-header-with-tabs">
            <h2 className="mm-panel-title">NPCs / Players</h2>

            <div className="mm-tabs">
              <button
                className={`mm-tab ${activeRightTab === "npcs" ? "active" : ""}`}
                onClick={() => setActiveRightTab("npcs")}
              >
                NPCs
              </button>
              <button
                className={`mm-tab ${activeRightTab === "players" ? "active" : ""}`}
                onClick={() => setActiveRightTab("players")}
              >
                Players
              </button>
            </div>
          </div>

          <div className="mm-panel-body mm-scrollable">

            {/* NPCs TAB */}
            {activeRightTab === "npcs" && (
              <div>
                <div className="mm-placeholder">NPC list + state UI</div>
              </div>
            )}

            {/* PLAYERS TAB */}
            {activeRightTab === "players" && (
              <div>
                {players.map((p) => (
                  <div key={p} className="mm-player-item">
                    {p}
                    <button
                      className="mm-btn-small"
                      onClick={() => handleRemovePlayer(p)}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <div className="mm-add-player">
                  <input
                    type="text"
                    value={newPlayerNumber}
                    placeholder="Phone Number"
                    onChange={(e) => setNewPlayerNumber(e.target.value)}
                    className="mm-input"
                  />
                  <button className="mm-btn" onClick={handleAddPlayer}>
                    Add Player
                  </button>
                </div>
              </div>
            )}

          </div>
        </section>

      </div>

    </div>
  );
}
