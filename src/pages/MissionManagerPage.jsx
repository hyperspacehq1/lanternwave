import React, { useState, useEffect, useMemo } from "react";
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
  getNPCState,
} from "../lib/mission-api";

// Local helper to call sessions API directly (no change to mission-api.js)
async function fetchSessions() {
  const res = await fetch("/.netlify/functions/api-mission-sessions");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error (api-mission-sessions): ${res.status} — ${text}`);
  }
  return res.json();
}

async function fetchMissionById(id) {
  if (!id) return null;
  const res = await fetch(`/.netlify/functions/api-missions?id=${id}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error (api-missions): ${res.status} — ${text}`);
  }
  return res.json();
}

// Skeleton components
const SkeletonRow = ({ width = "100%" }) => (
  <div className="mm-skeleton-row" style={{ width }} />
);

const SkeletonBlock = ({ height = "2rem" }) => (
  <div className="mm-skeleton-block" style={{ height }} />
);

export default function MissionManagerPage() {
  // Persisted active tab
  const [activeTab, setActiveTab] = useState("sessions");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("campaignTab");
      if (saved) setActiveTab(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("campaignTab", activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);

  // -----------------------------
  // CORE STATE
  // -----------------------------
  const [sessionList, setSessionList] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  const [playerList, setPlayerList] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPhone, setNewPlayerPhone] = useState("");

  const [eventList, setEventList] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [payloadIsValid, setPayloadIsValid] = useState(true);

  const [npcList, setNPCList] = useState([]);
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [npcState, setNPCState] = useState(null);

  const [messageList, setMessageList] = useState([]);

  // For logs inspector
  const [showInspector, setShowInspector] = useState(false);
  const [missionMeta, setMissionMeta] = useState(null);

  // Loading flags for skeletons
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingNpcState, setLoadingNpcState] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMissionMeta, setLoadingMissionMeta] = useState(false);

  // -----------------------------
  // INITIAL LOAD
  // -----------------------------
  useEffect(() => {
    loadSessions();
    loadNPCs();
  }, []);

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const sessions = await fetchSessions();
      setSessionList(sessions || []);
      // If nothing selected yet, auto-select latest
      if (!selectedSession && sessions && sessions.length > 0) {
        const latest = sessions[0];
        await handleSelectSession(latest);
      }
    } catch (error) {
      console.error("Failed loading sessions:", error);
    } finally {
      setLoadingSessions(false);
    }
  }

  async function loadNPCs() {
    try {
      const npcs = await listNPCs();
      setNPCList(npcs || []);
    } catch (error) {
      console.error("Failed loading NPCs:", error);
    }
  }

  // -----------------------------
  // SESSION SELECTION & CREATION
  // -----------------------------
  async function handleSelectSession(session) {
    setSelectedSession(session);
    setMissionMeta(null);
    setNPCState(null);
    setSelectedNPC(null);

    if (!session) return;

    // Load related data
    refreshPlayers(session.id);
    refreshEvents(session.id);
    refreshMessages(session.id);
    fetchMissionMeta(session);
  }

  async function handleCreateSession() {
    try {
      const name = window.prompt("Enter Campaign Session name:");
      if (!name) return;

      const session = await createSession(name);
      await loadSessions();
      await handleSelectSession(session);
    } catch (error) {
      console.error("Failed creating session:", error);
    }
  }

  async function fetchMissionMeta(session) {
    if (!session || !session.mission_id) return;
    setLoadingMissionMeta(true);
    try {
      const mission = await fetchMissionById(session.mission_id);
      setMissionMeta(mission || null);
    } catch (error) {
      console.error("Failed loading mission meta:", error);
    } finally {
      setLoadingMissionMeta(false);
    }
  }

  // -----------------------------
  // PLAYERS
  // -----------------------------
  async function refreshPlayers(sessionId) {
    setLoadingPlayers(true);
    try {
      const players = await listSessionPlayers(sessionId);
      setPlayerList(players || []);
    } catch (error) {
      console.error("Failed loading players:", error);
    } finally {
      setLoadingPlayers(false);
    }
  }

  async function handleAddPlayer() {
    if (!selectedSession) return;
    try {
      await addPlayerToSession(
        selectedSession.id,
        newPlayerName,
        newPlayerPhone
      );
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
    setLoadingEvents(true);
    try {
      const events = await listSessionEvents(sessionId);
      setEventList(events || []);
    } catch (error) {
      console.error("Failed loading events:", error);
    } finally {
      setLoadingEvents(false);
    }
  }

  function startCreateEvent() {
    setEditingEvent({
      id: null,
      severity: "info",
      summary: "",
      payload: {},
    });
    setPayloadIsValid(true);
  }

  async function saveEvent() {
    if (!selectedSession || !editingEvent || !payloadIsValid) return;
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
  // MESSAGES (for logs inspector)
  // -----------------------------
  async function refreshMessages(sessionId) {
    setLoadingMessages(true);
    try {
      const msgs = await listSessionMessages(sessionId);
      setMessageList(msgs || []);
    } catch (error) {
      console.error("Failed loading messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }

  // -----------------------------
  // NPC STATE
  // -----------------------------
  async function handleSelectNPC(npc) {
    if (!selectedSession) return;
    setSelectedNPC(npc);
    setLoadingNpcState(true);
    try {
      const state = await getNPCState(selectedSession.id, npc.id);
      setNPCState(state || {});
    } catch (error) {
      console.error("Failed loading NPC state:", error);
    } finally {
      setLoadingNpcState(false);
    }
  }

  // -----------------------------
  // LOGS INSPECTOR
  // -----------------------------
  function toggleInspector() {
    setShowInspector((prev) => !prev);
  }

  const directorPromptPreview = useMemo(() => {
    if (!selectedSession || !selectedNPC) {
      return "Select a Campaign Session and an NPC to see the Director prompt preview.";
    }

    const missionName = missionMeta?.name || "Unknown Operation";
    const region = missionMeta?.region || "Unknown Region";
    const summaryKnown = missionMeta?.summary_known || "";
    const summaryUnknown = missionMeta?.summary_unknown || "";
    const npcDisplay = selectedNPC.display_name || "The Director";

    const recentLines = (messageList || [])
      .slice(-8)
      .map((m) => {
        const tag = m.direction === "incoming" ? "PLAYER" : "DIRECTOR";
        return `[${tag}] ${m.body}`;
      })
      .join("\n");

    return [
      `You are ${npcDisplay}, the mission Director in a modern horror / cosmic conspiracy campaign.`,
      ``,
      `MISSION (PLAYER-KNOWN):`,
      summaryKnown,
      ``,
      `MISSION (GM-ONLY / SECRET):`,
      summaryUnknown,
      ``,
      `OPERATION METADATA:`,
      `- Campaign: ${missionName}`,
      `- Region: ${region}`,
      ``,
      `CONVERSATION HISTORY (most recent messages):`,
      recentLines || "(no prior messages in this operation)",
      ``,
      `Respond as ${npcDisplay}, staying in-universe and never breaking character.`,
    ].join("\n");
  }, [selectedSession, selectedNPC, missionMeta, messageList]);

  // -----------------------------
  // RENDER HELPERS
  // -----------------------------
  const hasSession = !!selectedSession;

  return (
    <div className="mission-manager">
      {/* HEADER BAR */}
      <div className="mm-header-row">
        <h1>Campaign Manager</h1>

        <div className="mm-header-meta">
          {hasSession && (
            <span className="mm-session-pill">
              Active Session:{" "}
              <strong>{selectedSession.session_name || selectedSession.id}</strong>
            </span>
          )}

          <button
            type="button"
            className={`mm-logs-toggle ${showInspector ? "active" : ""}`}
            onClick={toggleInspector}
          >
            GM LOGS
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="mm-tabs">
        <div
          className={`mm-tab ${activeTab === "sessions" ? "active" : ""}`}
          onClick={() => setActiveTab("sessions")}
        >
          Campaign Sessions
        </div>

        <div
          className={`mm-tab ${activeTab === "players" ? "active" : ""}`}
          onClick={() => hasSession && setActiveTab("players")}
          style={{ opacity: hasSession ? 1 : 0.4 }}
        >
          Players
        </div>

        <div
          className={`mm-tab ${activeTab === "events" ? "active" : ""}`}
          onClick={() => hasSession && setActiveTab("events")}
          style={{ opacity: hasSession ? 1 : 0.4 }}
        >
          Events
        </div>

        <div
          className={`mm-tab ${activeTab === "npc" ? "active" : ""}`}
          onClick={() => hasSession && setActiveTab("npc")}
          style={{ opacity: hasSession ? 1 : 0.4 }}
        >
          NPC Memory
        </div>
      </div>

      <div className="mm-container">
        {/* LEFT PANEL */}
        <div className="mm-left-panel">
          {/* ---------------- SESSIONS TAB ---------------- */}
          {activeTab === "sessions" && (
            <>
              <h2>Campaign Sessions</h2>

              <div className="mm-session-actions">
                <button className="mm-btn" onClick={loadSessions}>
                  Reload Sessions
                </button>
                <button className="mm-btn" onClick={handleCreateSession}>
                  + New Campaign Session
                </button>
              </div>

              {loadingSessions && sessionList.length === 0 && (
                <div className="mm-session-list">
                  <SkeletonRow />
                  <SkeletonRow width="85%" />
                  <SkeletonRow width="70%" />
                </div>
              )}

              {!loadingSessions && sessionList.length > 0 && (
                <div className="mm-session-list">
                  {sessionList.map((s) => (
                    <div
                      key={s.id}
                      className={`mm-session-row ${
                        selectedSession?.id === s.id ? "selected" : ""
                      }`}
                      onClick={() => handleSelectSession(s)}
                    >
                      <div className="mm-session-title">{s.session_name}</div>
                      <div className="mm-session-sub">
                        {s.status} —{" "}
                        {s.started_at
                          ? new Date(s.started_at).toLocaleString()
                          : "Unknown start"}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loadingSessions && sessionList.length === 0 && (
                <p className="mm-note">
                  No campaign sessions found. Create one to begin.
                </p>
              )}
            </>
          )}

          {/* ---------------- PLAYERS TAB ---------------- */}
          {activeTab === "players" && hasSession && (
            <>
              <h2>Players in Session</h2>

              <div className="mm-player-form">
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
                  onChange={(e) => setNewPlayerPhone(e.target.value)}
                />
                <button className="mm-btn" onClick={handleAddPlayer}>
                  Add Player
                </button>
              </div>

              {loadingPlayers && playerList.length === 0 && (
                <div className="mm-session-list">
                  <SkeletonRow />
                  <SkeletonRow width="80%" />
                </div>
              )}

              {!loadingPlayers && playerList.length > 0 && (
                <div className="mm-session-list">
                  {playerList.map((p) => (
                    <div key={p.id} className="mm-session-row">
                      <div className="mm-session-title">
                        {p.player_name || "(Unnamed)"}
                      </div>
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
              )}

              {!loadingPlayers && playerList.length === 0 && (
                <p className="mm-note">
                  No players in this session yet. Add at least one phone number
                  to start SMS play.
                </p>
              )}
            </>
          )}

          {/* ---------------- EVENTS TAB ---------------- */}
          {activeTab === "events" && hasSession && (
            <>
              <h2>Session Events</h2>

              <button className="mm-btn" onClick={startCreateEvent}>
                + Add Event
              </button>

              {loadingEvents && eventList.length === 0 && (
                <div className="mm-session-list">
                  <SkeletonRow />
                  <SkeletonRow width="90%" />
                  <SkeletonRow width="60%" />
                </div>
              )}

              {!loadingEvents && eventList.length > 0 && (
                <div className="mm-session-list">
                  {eventList.map((ev) => (
                    <div
                      key={ev.id}
                      className="mm-event-card"
                      onClick={() => {
                        setEditingEvent(ev);
                        setPayloadIsValid(true);
                      }}
                    >
                      <span className={`mm-chip ${ev.severity || "info"}`}>
                        {ev.severity}
                      </span>

                      <div className="mm-event-summary">
                        {ev.summary || "(no summary)"}
                      </div>

                      <div className="mm-event-sub">
                        {ev.created_at
                          ? new Date(ev.created_at).toLocaleString()
                          : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loadingEvents && eventList.length === 0 && (
                <p className="mm-note">
                  No events logged for this session yet.
                </p>
              )}
            </>
          )}

          {/* ---------------- NPC TAB ---------------- */}
          {activeTab === "npc" && hasSession && (
            <>
              <h2>NPCs in Campaign</h2>

              {npcList.length === 0 && (
                <p className="mm-note">No NPCs configured.</p>
              )}

              {npcList.length > 0 && (
                <div className="mm-session-list">
                  {npcList.map((npc) => (
                    <div
                      key={npc.id}
                      className={`mm-session-row ${
                        selectedNPC?.id === npc.id ? "selected" : ""
                      }`}
                      onClick={() => handleSelectNPC(npc)}
                    >
                      <div className="mm-session-title">
                        {npc.display_name}
                      </div>
                      <div className="mm-session-sub">
                        {npc.primary_category || ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="mm-right-panel">
          {/* EVENTS EDITOR */}
          {activeTab === "events" && editingEvent && (
            <div className="mm-panel-card">
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

              <label>Payload (JSON)</label>
              <textarea
                className={payloadIsValid ? "" : "mm-json-error"}
                value={JSON.stringify(editingEvent.payload || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setEditingEvent({ ...editingEvent, payload: parsed });
                    setPayloadIsValid(true);
                  } catch {
                    setPayloadIsValid(false);
                  }
                }}
              />

              <div className="mm-panel-actions">
                <button
                  className="mm-btn"
                  disabled={!payloadIsValid}
                  onClick={saveEvent}
                >
                  Save Event
                </button>

                {editingEvent.id && (
                  <button
                    className="mm-btn"
                    onClick={() => archiveEvent(editingEvent)}
                  >
                    Archive
                  </button>
                )}

                <button
                  className="mm-btn mm-btn-secondary"
                  onClick={() => setEditingEvent(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* NPC MEMORY VIEW */}
          {activeTab === "npc" && selectedNPC && (
            <div className="mm-panel-card">
              <h2>{selectedNPC.display_name}</h2>
              <p className="mm-note">
                NPC memory is <strong>per session + per phone number</strong>.
                If new players run the same campaign again, this NPC starts
                fresh for them.
              </p>

              {loadingNpcState && <SkeletonBlock height="200px" />}

              {!loadingNpcState && (
                <pre className="mm-event-json">
                  {JSON.stringify(npcState || {}, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* DEFAULT EMPTY STATE */}
          {activeTab !== "events" &&
            activeTab !== "npc" && (
              <div className="mm-panel-card mm-panel-empty">
                <p className="mm-note">
                  Select a tab and a campaign session on the left to view
                  details.
                </p>
              </div>
            )}
        </div>
      </div>

      {/* GM LOGS INSPECTOR */}
      <div className={`mm-logs-panel ${showInspector ? "open" : ""}`}>
        <div className="mm-logs-header">
          <div>
            <strong>GM Logs / Debug Console</strong>
            <div className="mm-logs-sub">
              For Keeper / GM use only. Not visible to players.
            </div>
          </div>
          <button className="mm-btn mm-btn-small" onClick={toggleInspector}>
            Close
          </button>
        </div>

        <div className="mm-logs-body">
          {/* Overview */}
          <section className="mm-logs-section">
            <h3>Session & Campaign</h3>
            {loadingMissionMeta && <SkeletonBlock height="80px" />}
            {!loadingMissionMeta && (
              <pre className="mm-logs-pre">
                {JSON.stringify(
                  {
                    session: selectedSession || null,
                    mission: missionMeta || null,
                  },
                  null,
                  2
                )}
              </pre>
            )}
          </section>

          {/* Players */}
          <section className="mm-logs-section">
            <h3>Players</h3>
            <pre className="mm-logs-pre">
              {JSON.stringify(playerList || [], null, 2)}
            </pre>
          </section>

          {/* Events */}
          <section className="mm-logs-section">
            <h3>Events</h3>
            <pre className="mm-logs-pre">
              {JSON.stringify(eventList || [], null, 2)}
            </pre>
          </section>

          {/* Messages */}
          <section className="mm-logs-section">
            <h3>Messages (last 100)</h3>
            {loadingMessages && <SkeletonBlock height="120px" />}
            {!loadingMessages && (
              <pre className="mm-logs-pre">
                {JSON.stringify((messageList || []).slice(-100), null, 2)}
              </pre>
            )}
          </section>

          {/* NPC Memory */}
          <section className="mm-logs-section">
            <h3>Selected NPC Memory</h3>
            <pre className="mm-logs-pre">
              {JSON.stringify(npcState || {}, null, 2)}
            </pre>
          </section>

          {/* Director Prompt Preview */}
          <section className="mm-logs-section">
            <h3>Director System Prompt (Preview)</h3>
            <pre className="mm-logs-pre">{directorPromptPreview}</pre>
          </section>
        </div>
      </div>
    </div>
  );
}
