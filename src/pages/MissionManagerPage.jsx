import React, { useState, useEffect, useMemo } from "react";
import "./mission-manager.css";

import {
  createSession,
  listMissions,
  createMission,
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

// Local helper to call sessions API directly (unchanged)
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
  // Persisted tab
  const [activeTab, setActiveTab] = useState("sessions");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("campaignTab");
      if (saved) setActiveTab(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("campaignTab", activeTab);
    } catch {}
  }, [activeTab]);

  // Campaign (Mission) state
  const [missionList, setMissionList] = useState([]);
  const [loadingMissions, setLoadingMissions] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState(null);

  // New campaign modal
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignRegion, setNewCampaignRegion] = useState("");
  const [newCampaignSummaryKnown, setNewCampaignSummaryKnown] = useState("");
  const [newCampaignSummaryUnknown, setNewCampaignSummaryUnknown] =
    useState("");

  // Session state
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

  // Logs inspector
  const [showInspector, setShowInspector] = useState(false);
  const [missionMeta, setMissionMeta] = useState(null);

  // Loading flags
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
    loadMissions();
    loadSessions();
    loadNPCs();
  }, []);

  async function loadMissions() {
    setLoadingMissions(true);
    try {
      const missions = await listMissions();
      setMissionList(missions || []);

      if (missions?.length > 0 && !selectedMissionId) {
        setSelectedMissionId(missions[0].id);
      }
    } catch (error) {
      console.error("Failed loading missions:", error);
    } finally {
      setLoadingMissions(false);
    }
  }

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const sessions = await fetchSessions();
      setSessionList(sessions || []);

      if (!selectedSession && sessions?.length > 0) {
        await handleSelectSession(sessions[0]);
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
  // SESSION MANAGEMENT
  // -----------------------------
  async function handleSelectSession(session) {
    setSelectedSession(session);
    setMissionMeta(null);
    setNPCState(null);
    setSelectedNPC(null);

    refreshPlayers(session.id);
    refreshEvents(session.id);
    refreshMessages(session.id);
    fetchMissionMeta(session);
  }

  async function handleCreateNewCampaign() {
    try {
      if (!newCampaignName.trim()) {
        alert("Campaign name is required");
        return;
      }

      const mission = await createMission(
        newCampaignName,
        newCampaignRegion,
        newCampaignSummaryKnown,
        newCampaignSummaryUnknown
      );

      // Add to list + select it
      await loadMissions();
      setSelectedMissionId(mission.id);

      // Reset modal
      setShowNewCampaignModal(false);
      setNewCampaignName("");
      setNewCampaignRegion("");
      setNewCampaignSummaryKnown("");
      setNewCampaignSummaryUnknown("");
    } catch (error) {
      console.error("Failed creating campaign:", error);
      alert("Failed creating campaign. Check logs.");
    }
  }

  async function handleCreateSession() {
    try {
      if (!selectedMissionId) {
        alert("Please select a Campaign first.");
        return;
      }

      const name = window.prompt("Enter Campaign Session name:");
      if (!name) return;

      const session = await createSession(
        selectedMissionId,
        name,
        ""
      );

      await loadSessions();
      await handleSelectSession(session);
    } catch (error) {
      console.error("Failed creating session:", error);
    }
  }

  async function fetchMissionMeta(session) {
    if (!session?.mission_id) return;
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
  // MESSAGES
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
  // LOGS INSPECTOR
  // -----------------------------
  const directorPromptPreview = useMemo(() => {
    if (!selectedSession || !selectedNPC) return "Select a session + NPC";

    const missionName = missionMeta?.name || "Unknown Campaign";
    const region = missionMeta?.region || "Unknown Region";

    const summaryKnown = missionMeta?.summary_known || "";
    const summaryUnknown = missionMeta?.summary_unknown || "";

    const npcName = selectedNPC.display_name || "Director";

    const recentLines = (messageList || [])
      .slice(-8)
      .map((m) => {
        const tag = m.direction === "incoming" ? "PLAYER" : "DIRECTOR";
        return `[${tag}] ${m.body}`;
      })
      .join("\n");

    return [
      `You are ${npcName}, the Director of a cosmic conspiracy campaign.`,
      ``,
      `MISSION (PLAYER-KNOWN):`,
      summaryKnown,
      ``,
      `MISSION SECRET (GM-ONLY):`,
      summaryUnknown,
      ``,
      `CAMPAIGN META:`,
      `  Name: ${missionName}`,
      `  Region: ${region}`,
      ``,
      `RECENT MESSAGES:`,
      recentLines || "(none)",
      "",
      "Stay in-character. Maintain tone of dread and realism."
    ].join("\n");
  }, [selectedSession, selectedNPC, missionMeta, messageList]);

  // -----------------------------
  // RENDER
  // -----------------------------
  const hasSession = !!selectedSession;

  return (
    <div className="mission-manager">

      {/* HEADER */}
      <div className="mm-header-row">
        <h1>Campaign Manager</h1>

        <div className="mm-header-meta">
          {hasSession && (
            <span className="mm-session-pill">
              Active Session:{" "}
              <strong>{selectedSession.session_name}</strong>
            </span>
          )}

          <button
            className={`mm-logs-toggle ${showInspector ? "active" : ""}`}
            onClick={() => setShowInspector(!showInspector)}
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
          Sessions
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

          {/* ---------------- SESSIONS ---------------- */}
          {activeTab === "sessions" && (
            <>
              <h2>Campaign Sessions</h2>

              <h3>Select Campaign</h3>

              {loadingMissions && (
                <SkeletonRow width="85%" />
              )}

              {!loadingMissions && (
                <select
                  className="mm-select"
                  value={selectedMissionId || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__create_new__") {
                      setShowNewCampaignModal(true);
                    } else {
                      setSelectedMissionId(Number(v));
                    }
                  }}
                >
                  {missionList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}

                  <option value="__create_new__">
                    ➕ Create New Campaign…
                  </option>
                </select>
              )}

              <div className="mm-session-actions">
                <button className="mm-btn" onClick={loadSessions}>
                  Reload Sessions
                </button>
                <button className="mm-btn" onClick={handleCreateSession}>
                  + New Campaign Session
                </button>
              </div>

              {loadingSessions && (
                <>
                  <SkeletonRow />
                  <SkeletonRow width="70%" />
                </>
              )}

              {!loadingSessions &&
                sessionList.length === 0 && (
                  <p className="mm-note">
                    No sessions found.
                  </p>
                )}

              {!loadingSessions &&
                sessionList.length > 0 && (
                  <div className="mm-session-list">
                    {sessionList.map((s) => (
                      <div
                        key={s.id}
                        className={`mm-session-row ${
                          selectedSession?.id === s.id ? "selected" : ""
                        }`}
                        onClick={() => handleSelectSession(s)}
                      >
                        <div className="mm-session-title">
                          {s.session_name}
                        </div>
                        <div className="mm-session-sub">
                          {s.status} —{" "}
                          {s.started_at
                            ? new Date(
                                s.started_at
                              ).toLocaleString()
                            : "Unknown"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </>
          )}

          {/* ---------------- PLAYERS ---------------- */}
          {activeTab === "players" && hasSession && (
            <>
              <h2>Players</h2>

              <div className="mm-player-form">
                <input
                  type="text"
                  placeholder="Name"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={newPlayerPhone}
                  onChange={(e) => setNewPlayerPhone(e.target.value)}
                />
                <button className="mm-btn" onClick={handleAddPlayer}>
                  Add
                </button>
              </div>

              {loadingPlayers && <SkeletonRow />}

              {!loadingPlayers &&
                playerList.length === 0 && (
                  <p className="mm-note">No players yet.</p>
                )}

              {!loadingPlayers &&
                playerList.length > 0 && (
                  <div className="mm-session-list">
                    {playerList.map((p) => (
                      <div key={p.id} className="mm-session-row">
                        <div className="mm-session-title">
                          {p.player_name}
                        </div>
                        <div className="mm-session-sub">
                          {p.phone_number}
                        </div>

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
            </>
          )}

          {/* ---------------- EVENTS ---------------- */}
          {activeTab === "events" && hasSession && (
            <>
              <h2>Events</h2>

              <button className="mm-btn" onClick={startCreateEvent}>
                + Add Event
              </button>

              {loadingEvents && (
                <>
                  <SkeletonRow />
                  <SkeletonRow width="60%" />
                </>
              )}

              {!loadingEvents &&
                eventList.length === 0 && (
                  <p className="mm-note">No events.</p>
                )}

              {!loadingEvents &&
                eventList.length > 0 && (
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
                        <span className={`mm-chip ${ev.severity}`}>
                          {ev.severity}
                        </span>

                        <div className="mm-event-summary">
                          {ev.summary}
                        </div>

                        <div className="mm-event-sub">
                          {ev.created_at
                            ? new Date(
                                ev.created_at
                              ).toLocaleString()
                            : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </>
          )}

          {/* ---------------- NPC ---------------- */}
          {activeTab === "npc" && hasSession && (
            <>
              <h2>NPCs</h2>

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
                        {npc.primary_category}
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

          {/* EVENT EDITOR */}
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
                value={JSON.stringify(editingEvent.payload, null, 2)}
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
                  Save
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

              {loadingNpcState && <SkeletonBlock height="200px" />}

              {!loadingNpcState && (
                <pre className="mm-event-json">
                  {JSON.stringify(npcState, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* EMPTY RIGHT PANEL */}
          {!editingEvent && activeTab !== "npc" && (
            <div className="mm-panel-card mm-panel-empty">
              <p className="mm-note">
                Select a session, event, or NPC to view details.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* GM LOGS */}
      <div className={`mm-logs-panel ${showInspector ? "open" : ""}`}>
        <div className="mm-logs-header">
          <div>
            <strong>GM Logs / Debug Console</strong>
            <div className="mm-logs-sub">GM only</div>
          </div>
          <button
            className="mm-btn mm-btn-small"
            onClick={() => setShowInspector(false)}
          >
            Close
          </button>
        </div>

        <div className="mm-logs-body">
          <section className="mm-logs-section">
            <h3>Session & Campaign</h3>
            {!loadingMissionMeta ? (
              <pre className="mm-logs-pre">
                {JSON.stringify(
                  {
                    session: selectedSession,
                    mission: missionMeta,
                  },
                  null,
                  2
                )}
              </pre>
            ) : (
              <SkeletonBlock height="80px" />
            )}
          </section>

          <section className="mm-logs-section">
            <h3>Players</h3>
            <pre className="mm-logs-pre">
              {JSON.stringify(playerList, null, 2)}
            </pre>
          </section>

          <section className="mm-logs-section">
            <h3>Events</h3>
            <pre className="mm-logs-pre">
              {JSON.stringify(eventList, null, 2)}
            </pre>
          </section>

          <section className="mm-logs-section">
            <h3>Messages (last 100)</h3>
            {!loadingMessages ? (
              <pre className="mm-logs-pre">
                {JSON.stringify(messageList.slice(-100), null, 2)}
              </pre>
            ) : (
              <SkeletonBlock height="120px" />
            )}
          </section>

          <section className="mm-logs-section">
            <h3>NPC Memory</h3>
            <pre className="mm-logs-pre">
              {JSON.stringify(npcState, null, 2)}
            </pre>
          </section>

          <section className="mm-logs-section">
            <h3>Director System Prompt (Preview)</h3>
            <pre className="mm-logs-pre">{directorPromptPreview}</pre>
          </section>
        </div>
      </div>

      {/* NEW CAMPAIGN MODAL */}
      {showNewCampaignModal && (
        <div className="mm-modal-backdrop">
          <div className="mm-modal">
            <h2>Create New Campaign</h2>

            <label>Campaign Name</label>
            <input
              type="text"
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
            />

            <label>Region</label>
            <input
              type="text"
              value={newCampaignRegion}
              onChange={(e) => setNewCampaignRegion(e.target.value)}
            />

            <label>Summary (Player-Known)</label>
            <textarea
              value={newCampaignSummaryKnown}
              onChange={(e) => setNewCampaignSummaryKnown(e.target.value)}
            />

            <label>Summary (GM-Only Secrets)</label>
            <textarea
              value={newCampaignSummaryUnknown}
              onChange={(e) =>
                setNewCampaignSummaryUnknown(e.target.value)
              }
            />

            <div className="mm-modal-actions">
              <button className="mm-btn" onClick={handleCreateNewCampaign}>
                Create Campaign
              </button>
              <button
                className="mm-btn mm-btn-secondary"
                onClick={() => setShowNewCampaignModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
