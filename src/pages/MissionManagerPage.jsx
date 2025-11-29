import React, { useState, useEffect } from "react";
import "./mission-manager.css";

import {
  createSession,
  listSessionPlayers,
  addPlayerToSession,
  removePlayer,
  listSessionEvents,
  createSessionEvent,
  updateSessionEvent,
  archiveSessionEvent,
  listSessionMessages,
  listNPCs,
  getNPCState
} from "../lib/mission-api";

export default function MissionManagerPage() {
  const [activeTab, setActiveTab] = useState("sessions");
  const [sessionList, setSessionList] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  const [playerList, setPlayerList] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPhone, setNewPlayerPhone] = useState("");

  const [eventList, setEventList] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);

  const [npcList, setNPCList] = useState([]);
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [npcState, setNPCState] = useState(null);

  useEffect(() => {
    loadNPCs();
  }, []);

  async function loadNPCs() {
    try {
      const npcs = await listNPCs();
      setNPCList(npcs || []);
    } catch (error) {
      console.error("Failed loading NPCs:", error);
    }
  }

  // -----------------------------
  // SESSION SELECTION
  // -----------------------------
  async function handleSelectSession(session) {
    setSelectedSession(session);

    // Load tab-specific data
    refreshPlayers(session.id);
    refreshEvents(session.id);
  }

  // -----------------------------
  // PLAYERS
  // -----------------------------
  async function refreshPlayers(sessionId) {
    try {
      const players = await listSessionPlayers(sessionId);
      setPlayerList(players || []);
    } catch (error) {
      console.error("Failed loading players:", error);
    }
  }

  async function handleAddPlayer() {
    if (!selectedSession) return;

    try {
      await addPlayerToSession(selectedSession.id, newPlayerName, newPlayerPhone);
      setNewPlayerName("");
      setNewPlayerPhone("");
      refreshPlayers(selectedSession.id);
    } catch (error) {
      console.error("Failed adding player:", error);
    }
  }

  async function handleRemovePlayer(player) {
    if (!selectedSession) return;

    try {
      await removePlayer(selectedSession.id, player.phone_number);
      refreshPlayers(selectedSession.id);
    } catch (error) {
      console.error("Failed removing player:", error);
    }
  }

  // -----------------------------
  // EVENTS
  // -----------------------------
  async function refreshEvents(sessionId) {
    try {
      const events = await listSessionEvents(sessionId);
      setEventList(events || []);
    } catch (error) {
      console.error("Failed loading events:", error);
    }
  }

  function startCreateEvent() {
    setEditingEvent({
      id: null,
      severity: "info",
      summary: "",
      payload: {}
    });
  }

  async function saveEvent() {
    if (!selectedSession || !editingEvent) return;

    try {
      if (editingEvent.id) {
        await updateSessionEvent(
          selectedSession.id,
          editingEvent.id,
          editingEvent
        );
      } else {
        await createSessionEvent(selectedSession.id, editingEvent);
      }

      setEditingEvent(null);
      refreshEvents(selectedSession.id);
    } catch (error) {
      console.error("Failed saving event:", error);
    }
  }

  async function archiveEvent(evt) {
    if (!selectedSession) return;

    try {
      await archiveSessionEvent(selectedSession.id, evt.id);
      refreshEvents(selectedSession.id);
    } catch (error) {
      console.error("Failed archiving event:", error);
    }
  }

  // -----------------------------
  // NPC STATE
  // -----------------------------
  async function handleSelectNPC(npc) {
    setSelectedNPC(npc);
    try {
      const state = await getNPCState(selectedSession.id, npc.id);
      setNPCState(state || {});
    } catch (error) {
      console.error("Failed loading NPC state:", error);
    }
  }

  // -----------------------------
  // MAIN RENDER
  // -----------------------------

  return (
    <div className="mission-manager">

      {/* PAGE TITLE */}
      <h1>Mission Manager</h1>

      {/* TABS */}
      <div className="mm-tabs">
        <div
          className={`mm-tab ${activeTab === "sessions" ? "active" : ""}`}
          onClick={() => setActiveTab("sessions")}
        >
          Sessions
        </div>

        <div
          className={`mm-tab ${activeTab === "players" ? "active" : ""}`}
          onClick={() => setActiveTab("players")}
          style={{ opacity: selectedSession ? 1 : 0.4 }}
        >
          Players
        </div>

        <div
          className={`mm-tab ${activeTab === "events" ? "active" : ""}`}
          onClick={() => selectedSession && setActiveTab("events")}
          style={{ opacity: selectedSession ? 1 : 0.4 }}
        >
          Events
        </div>

        <div
          className={`mm-tab ${activeTab === "npc" ? "active" : ""}`}
          onClick={() => selectedSession && setActiveTab("npc")}
          style={{ opacity: selectedSession ? 1 : 0.4 }}
        >
          NPC State
        </div>
      </div>

      <div className="mm-container">

        {/* LEFT PANEL */}
        <div className="mm-left-panel">

          {activeTab === "sessions" && (
            <>
              <h2>Sessions</h2>
              <p>Use Controller to create or manage active sessions.</p>
            </>
          )}

          {activeTab === "players" && selectedSession && (
            <>
              <h2>Players</h2>

              <div className="mm-player-form">
                <input
                  type="text"
                  placeholder="Player name"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={newPlayerPhone}
                  onChange={(e) => setNewPlayerPhone(e.target.value)}
                />
                <button className="mm-btn" onClick={handleAddPlayer}>
                  Add Player
                </button>
              </div>

              <div className="mm-session-list">
                {playerList.map((p) => (
                  <div key={p.id} className="mm-session-row">
                    <div className="mm-session-title">{p.player_name}</div>
                    <div className="mm-session-sub">{p.phone_number}</div>

                    <button
                      className="mm-btn"
                      onClick={() => handleRemovePlayer(p)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === "events" && selectedSession && (
            <>
              <h2>Events</h2>

              <button className="mm-btn" onClick={startCreateEvent}>
                + Add Event
              </button>

              <div className="mm-session-list">
                {eventList.map((ev) => (
                  <div
                    key={ev.id}
                    className="mm-event-card"
                    onClick={() => setEditingEvent(ev)}
                  >
                    <span className={`mm-chip ${ev.severity || "info"}`}>
                      {ev.severity}
                    </span>

                    <div className="mm-event-summary">{ev.summary}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === "npc" && selectedSession && (
            <>
              <h2>NPCs</h2>

              <div className="mm-session-list">
                {npcList.map((npc) => (
                  <div
                    key={npc.id}
                    className="mm-session-row"
                    onClick={() => handleSelectNPC(npc)}
                  >
                    <div className="mm-session-title">{npc.display_name}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="mm-right-panel">
          {activeTab === "events" && editingEvent && (
            <>
              <h2>{editingEvent.id ? "Edit Event" : "New Event"}</h2>

              <label>Severity</label>
              <select
                value={editingEvent.severity}
                onChange={(e) =>
                  setEditingEvent({
                    ...editingEvent,
                    severity: e.target.value,
                  })
                }
              >
                <option value="info">Info</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <label>Summary</label>
              <input
                type="text"
                value={editingEvent.summary}
                onChange={(e) =>
                  setEditingEvent({
                    ...editingEvent,
                    summary: e.target.value,
                  })
                }
              />

              <label>Payload</label>
              <textarea
                value={JSON.stringify(editingEvent.payload, null, 2)}
                onChange={(e) => {
                  try {
                    setEditingEvent({
                      ...editingEvent,
                      payload: JSON.parse(e.target.value),
                    });
                  } catch (err) {}
                }}
              />

              <button className="mm-btn" onClick={saveEvent}>
                Save Event
              </button>

              {editingEvent.id && (
                <button
                  className="mm-btn"
                  style={{ marginTop: "0.5rem" }}
                  onClick={() => archiveEvent(editingEvent)}
                >
                  Archive Event
                </button>
              )}
            </>
          )}

          {activeTab === "npc" && selectedNPC && (
            <>
              <h2>{selectedNPC.display_name}</h2>
              <pre className="mm-event-json">
                {JSON.stringify(npcState, null, 2)}
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
