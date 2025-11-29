// =========================================================
// MissionManagerPage.jsx — FINAL DEPLOY-SAFE VERSION
// Matching current backend, no missing exports, .mm namespace clean
// =========================================================

import React, { useEffect, useState } from "react";

import {
  listSessions,
  createSession,
  listSessionPlayers,
  addPlayerToSession,
  removePlayer,
  listSessionEvents,
  createSessionEvent,
  updateSessionEvent,
  archiveSessionEvent,
  listSessionMessages,
  getNPCState
} from "../lib/mission-api.js";

import EventModal from "../components/EventModal.jsx";
import EventEditor from "../components/EventEditor.jsx";

export default function MissionManagerPage() {

  // -------------------------
  // STATE
  // -------------------------
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  const [missionIdInput, setMissionIdInput] = useState("");
  const [sessionNameInput, setSessionNameInput] = useState("");
  const [gmNotesInput, setGmNotesInput] = useState("");

  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPhone, setNewPlayerPhone] = useState("");

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState(null);

  const [logs, setLogs] = useState([]);

  // NPC List (stays empty until backend exports endpoints)
  const [npcs, setNpcs] = useState([]);
  const [npcStateView, setNpcStateView] = useState(null);

  // -------------------------
  // INITIAL LOAD
  // -------------------------
  useEffect(() => {
    refreshSessions();
  }, []);

  async function refreshSessions() {
    try {
      const data = await listSessions();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Failed to load sessions", err);
    }
  }

  // -------------------------
  // SELECT SESSION
  // -------------------------
  async function handleSelectSession(session) {
    setSelectedSession(session);
    setSelectedSessionId(session.id);

    await refreshPlayers(session.id);
    await refreshEvents(session.id);
    await refreshLogs(session.id);

    // NPC fetch disabled because backend doesn't expose listNPCs
    setNpcs([]);
  }

  // -------------------------
  // CREATE SESSION
  // -------------------------
  async function handleCreateSession() {
    try {
      const mid = Number(missionIdInput);
      if (!mid || !sessionNameInput.trim()) {
        alert("Mission ID and Session Name are required.");
        return;
      }

      await createSession(mid, sessionNameInput.trim(), gmNotesInput.trim());

      setMissionIdInput("");
      setSessionNameInput("");
      setGmNotesInput("");

      await refreshSessions();
    } catch (err) {
      console.error("Create session failed", err);
      alert("Create session failed.");
    }
  }

  // -------------------------
  // PLAYERS
  // -------------------------
  async function refreshPlayers(sessionId) {
    try {
      const res = await listSessionPlayers(sessionId);
      setPlayers(res.players || []);
    } catch (err) {
      console.error("Failed to load players", err);
    }
  }

  async function handleAddPlayer() {
    if (!newPlayerName.trim() || !newPlayerPhone.trim()) {
      alert("Player name & phone required");
      return;
    }
    try {
      await addPlayerToSession(
        selectedSessionId,
        newPlayerName.trim(),
        newPlayerPhone.trim()
      );

      setNewPlayerName("");
      setNewPlayerPhone("");

      await refreshPlayers(selectedSessionId);
    } catch (err) {
      console.error("Failed to add player", err);
    }
  }

  async function handleRemovePlayer(player) {
    try {
      await removePlayer(player.id);
      await refreshPlayers(selectedSessionId);
    } catch (err) {
      console.error("Failed to remove player", err);
    }
  }

  // -------------------------
  // EVENTS
  // -------------------------
  async function refreshEvents(sessionId) {
    try {
      const res = await listSessionEvents(sessionId);
      setEvents(res.events || []);
      setSelectedEventId(null);
    } catch (err) {
      console.error("Failed to load events", err);
    }
  }

  function openAddEventModal() {
    setEditEvent(null);
    setEventModalOpen(true);
  }

  async function handleSaveEvent(data) {
    try {
      if (editEvent) {
        await updateSessionEvent({ id: editEvent.id, ...data });
      } else {
        await createSessionEvent({
          session_id: selectedSessionId,
          ...data
        });
      }
      setEventModalOpen(false);
      await refreshEvents(selectedSessionId);
    } catch (err) {
      console.error("Failed to save event", err);
      alert("Failed to save event.");
    }
  }

  async function handleArchiveEvent(eventId) {
    try {
      await archiveSessionEvent(eventId);
      await refreshEvents(selectedSessionId);
      setSelectedEventId(null);
    } catch (err) {
      console.error("Failed to archive event", err);
    }
  }

  // -------------------------
  // LOGS
  // -------------------------
  async function refreshLogs(sessionId) {
    try {
      const res = await listSessionMessages(sessionId);
      setLogs(res.messages || []);
    } catch (err) {
      console.error("Failed to load logs", err);
    }
  }

  // -------------------------
  // NPC STATE
  // -------------------------
  async function loadNpcState(npc) {
    try {
      const res = await getNPCState(selectedSessionId, npc.id);
      setNpcStateView(res.state || res);
    } catch (err) {
      console.error("Failed to load NPC state", err);
    }
  }

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="mission-manager-page">
      <h1 className="page-title">Mission Manager</h1>

      {/* ===================== SESSION LIST ===================== */}
      <section className="section">
        <h2>Sessions</h2>

        <div className="session-list">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={
                "session-card " + (selectedSessionId === s.id ? "selected" : "")
              }
              onClick={() => handleSelectSession(s)}
            >
              <strong>{s.session_name}</strong>
              <div className="session-meta">
                Mission: {s.mission_id} <br />
                Status: {s.status}
              </div>
            </div>
          ))}
        </div>

        <div className="create-session">
          <h3>Create New Session</h3>

          <input
            type="number"
            placeholder="Mission ID"
            value={missionIdInput}
            onChange={(e) => setMissionIdInput(e.target.value)}
          />

          <input
            type="text"
            placeholder="Session Name"
            value={sessionNameInput}
            onChange={(e) => setSessionNameInput(e.target.value)}
          />

          <textarea
            placeholder="GM Notes"
            value={gmNotesInput}
            onChange={(e) => setGmNotesInput(e.target.value)}
          />

          <button onClick={handleCreateSession}>Create Session</button>
        </div>
      </section>

      {/* ===================== SESSION DETAILS ===================== */}
      {selectedSession && (
        <section className="section">
          <h2>
            Session: {selectedSession.session_name} (ID {selectedSession.id})
          </h2>

          {/* ------------------------- PLAYERS ------------------------- */}
          <div className="card">
            <h3>Players</h3>

            <div className="player-list">
              {players.map((p) => (
                <div key={p.id} className="player-item">
                  {p.player_name} ({p.phone_number})
                  <button onClick={() => handleRemovePlayer(p)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="player-add">
              <input
                type="text"
                placeholder="Player Name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
              />

              <input
                type="text"
                placeholder="Phone Number"
                value={newPlayerPhone}
                onChange={(e) =>
                  setNewPlayerPhone(e.target.value)
                }
              />

              <button onClick={handleAddPlayer}>Add Player</button>
            </div>
          </div>

          {/* ------------------------- EVENTS ------------------------- */}
          <div className="card event-panel">
            <h3>Mission Events</h3>

            <div className="event-panel-content">
              {/* LEFT COLUMN */}
              <div className="event-list-column">
                {events.length === 0 ? (
                  <div className="empty-events">
                    <p>No mission events recorded.</p>
                    <button onClick={openAddEventModal}>
                      Add First Event
                    </button>
                  </div>
                ) : (
                  <div className="event-list">
                    {events.map((ev) => {
                      const data = ev.event_data || {};
                      const sev = (data.severity || "info").toLowerCase();
                      const summary = data.summary || "(no summary)";
                      const details = data.details || "";

                      return (
                        <div
                          key={ev.id}
                          className={`event-item sev-${sev} ${
                            selectedEventId === ev.id ? "selected" : ""
                          }`}
                          onClick={() => setSelectedEventId(ev.id)}
                        >
                          <div className="event-header">
                            <strong>{summary}</strong>
                            <span className={`sev sev-${sev}`}>
                              {sev.toUpperCase()}
                            </span>
                          </div>

                          <div className="event-meta">
                            {ev.event_type} — {ev.phone_number || "GM"}
                          </div>

                          {details && (
                            <div className="event-details">{details}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN — EDITOR */}
              <div className="event-editor-column">
                {selectedEventId === null ? (
                  <div className="empty-events">
                    <p>
                      Select an event to edit,<br />or add a new one.
                    </p>
                    <button onClick={openAddEventModal}>Add Event</button>
                  </div>
                ) : (
                  <EventEditor
                    sessionId={selectedSessionId}
                    selectedEvent={events.find((e) => e.id === selectedEventId)}
                    onSave={handleSaveEvent}
                    onArchive={handleArchiveEvent}
                    onCancel={() => setSelectedEventId(null)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ------------------------- LOGS ------------------------- */}
          <div className="card">
            <h3>Message Logs</h3>
            <div className="log-list">
              {logs.map((l, idx) => (
                <div key={idx} className="log-item">
                  <strong>{l.phone_number}</strong> — {l.body}
                </div>
              ))}
            </div>
          </div>

          {/* ------------------------- NPC STATE ------------------------- */}
          <div className="card">
            <h3>NPCs</h3>

            <div className="npc-list">
              {npcs.map((npc) => (
                <div
                  key={npc.id}
                  className="npc-item"
                  onClick={() => loadNpcState(npc)}
                >
                  {npc.display_name}
                </div>
              ))}
            </div>

            {npcStateView && (
              <div className="npc-state-view">
                <h4>NPC State</h4>
                <pre>{JSON.stringify(npcStateView, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* EVENT MODAL */}
          <EventModal
            open={eventModalOpen}
            onClose={() => setEventModalOpen(false)}
            onSave={handleSaveEvent}
            eventRecord={editEvent}
          />
        </section>
      )}
    </div>
  );
}
