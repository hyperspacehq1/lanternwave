import React, { useState, useEffect, useMemo } from "react";
import "./mission-manager.css";

import {
  listMissions,
  listSessions,
  createMission,
  createSession,
  listSessionPlayers,
  addPlayerToSession,
  removePlayer,
  listSessionEvents,
  createSessionEvent,
  updateSessionEvent,
  archiveSessionEvent,
  listSessionMessages,
  listAllNPCs,
  listMissionNPCs,
  addNPCToMission,
  removeNPCFromMission,
  getNPCState,
  createNPC,
} from "../lib/mission-api";

// helper to fetch a single mission by id
async function fetchMissionById(id) {
  if (!id) return null;
  const res = await fetch(`/.netlify/functions/api-missions?id=${id}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error (api-missions): ${res.status} — ${text}`);
  }
  return res.json();
}

// skeleton loaders
const SkeletonRow = ({ width = "100%" }) => (
  <div className="mm-skeleton-row" style={{ width }} />
);

const SkeletonBlock = ({ height = "2rem" }) => (
  <div className="mm-skeleton-block" style={{ height }} />
);

export default function MissionManagerPage() {
  // persisted tab
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

  // campaigns (missions)
  const [missionList, setMissionList] = useState([]);
  const [selectedMissionId, setSelectedMissionId] = useState(null);
  const [loadingMissions, setLoadingMissions] = useState(false);

  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignRegion, setNewCampaignRegion] = useState("");
  const [newCampaignSummaryKnown, setNewCampaignSummaryKnown] = useState("");
  const [newCampaignSummaryUnknown, setNewCampaignSummaryUnknown] =
    useState("");

  // sessions
  const [sessionList, setSessionList] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // players
  const [playerList, setPlayerList] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPhone, setNewPlayerPhone] = useState("");
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // events
  const [eventList, setEventList] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [payloadIsValid, setPayloadIsValid] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // NPCs
  const [campaignNPCs, setCampaignNPCs] = useState([]);
  const [allNPCs, setAllNPCs] = useState([]);
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [npcState, setNPCState] = useState(null);
  const [loadingNpcState, setLoadingNpcState] = useState(false);

  // New NPC modal
  const [showNewNPCModal, setShowNewNPCModal] = useState(false);
  const [npcDisplayName, setNpcDisplayName] = useState("");
  const [npcTrueName, setNpcTrueName] = useState("");
  const [npcPrimaryCategory, setNpcPrimaryCategory] = useState("");
  const [npcSecondarySubtype, setNpcSecondarySubtype] = useState("");
  const [npcIntent, setNpcIntent] = useState("");
  const [npcDescriptionPublic, setNpcDescriptionPublic] = useState("");
  const [npcDescriptionSecret, setNpcDescriptionSecret] = useState("");
  const [npcGoalsText, setNpcGoalsText] = useState("");
  const [npcSecretsText, setNpcSecretsText] = useState("");
  const [npcToneText, setNpcToneText] = useState("");
  const [npcNotes, setNpcNotes] = useState("");
  const [npcPersonalityJson, setNpcPersonalityJson] = useState("{}");
  const [npcTruthPolicyJson, setNpcTruthPolicyJson] = useState("{}");
  const [npcJsonValid, setNpcJsonValid] = useState(true);

  // messages + logs
  const [messageList, setMessageList] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [missionMeta, setMissionMeta] = useState(null);
  const [loadingMissionMeta, setLoadingMissionMeta] = useState(false);

  // initial load
  useEffect(() => {
    loadMissions();
    loadSessions();
  }, []);

  async function loadMissions() {
    setLoadingMissions(true);
    try {
      const missions = await listMissions();
      setMissionList(missions || []);
      if (missions?.length && !selectedMissionId) {
        setSelectedMissionId(missions[0].id);
      }
    } catch (err) {
      console.error("Failed loading missions:", err);
    } finally {
      setLoadingMissions(false);
    }
  }

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const sessions = await listSessions();
      setSessionList(sessions || []);
      if (!selectedSession && sessions?.length) {
        handleSelectSession(sessions[0]);
      }
    } catch (err) {
      console.error("Failed loading sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  }

  // campaign NPC roster load when mission changes
  useEffect(() => {
    if (!selectedMissionId) return;
    refreshCampaignNPCs(selectedMissionId);
    refreshAllNPCs();
  }, [selectedMissionId]);

  async function refreshCampaignNPCs(missionId) {
    try {
      const roster = await listMissionNPCs(missionId);
      setCampaignNPCs(roster || []);
    } catch (err) {
      console.error("Failed loading mission NPCs:", err);
    }
  }

  async function refreshAllNPCs() {
    try {
      const npcs = await listAllNPCs();
      setAllNPCs(npcs || []);
    } catch (err) {
      console.error("Failed loading global NPCs:", err);
    }
  }

  const availableNPCs = useMemo(() => {
    const used = new Set(campaignNPCs.map((r) => r.npc_id));
    return allNPCs.filter((n) => !used.has(n.id));
  }, [campaignNPCs, allNPCs]);

  async function handleAddNPCToCampaign(npc) {
    if (!selectedMissionId) return;
    try {
      await addNPCToMission(selectedMissionId, npc.id, false, "");
      await refreshCampaignNPCs(selectedMissionId);
    } catch (err) {
      console.error("Failed adding NPC to campaign:", err);
    }
  }

  async function handleRemoveNPCFromCampaign(entry) {
    if (!selectedMissionId) return;
    try {
      await removeNPCFromMission(selectedMissionId, entry.npc_id);
      await refreshCampaignNPCs(selectedMissionId);
      if (selectedNPC?.npc_id === entry.npc_id) {
        setSelectedNPC(null);
        setNPCState(null);
      }
    } catch (err) {
      console.error("Failed removing NPC from campaign:", err);
    }
  }

  async function handleCreateNewNPC() {
    try {
      if (!npcDisplayName.trim()) {
        alert("Display Name is required.");
        return;
      }

      let personalityObj = {};
      let truthPolicyObj = {};
      try {
        personalityObj = JSON.parse(npcPersonalityJson || "{}");
        truthPolicyObj = JSON.parse(npcTruthPolicyJson || "{}");
        setNpcJsonValid(true);
      } catch {
        setNpcJsonValid(false);
        alert("Personality / Truth Policy JSON is invalid.");
        return;
      }

      const npc = await createNPC({
        display_name: npcDisplayName,
        true_name: npcTrueName,
        description_public: npcDescriptionPublic,
        description_secret: npcDescriptionSecret,
        primary_category: npcPrimaryCategory,
        secondary_subtype: npcSecondarySubtype,
        intent: npcIntent,
        notes: npcNotes,
        personality_json: personalityObj,
        goals_text: npcGoalsText,
        secrets_text: npcSecretsText,
        truth_policy_json: truthPolicyObj,
        tone_text: npcToneText,
      });

      if (selectedMissionId && npc?.id) {
        await addNPCToMission(selectedMissionId, npc.id, false, "");
      }

      await refreshAllNPCs();
      await refreshCampaignNPCs(selectedMissionId);

      setShowNewNPCModal(false);
      setNpcDisplayName("");
      setNpcTrueName("");
      setNpcPrimaryCategory("");
      setNpcSecondarySubtype("");
      setNpcIntent("");
      setNpcDescriptionPublic("");
      setNpcDescriptionSecret("");
      setNpcGoalsText("");
      setNpcSecretsText("");
      setNpcToneText("");
      setNpcNotes("");
      setNpcPersonalityJson("{}");
      setNpcTruthPolicyJson("{}");
      setNpcJsonValid(true);
    } catch (err) {
      console.error("Failed creating NPC:", err);
      alert("Failed creating NPC. Check logs.");
    }
  }

  // session selection
  async function handleSelectSession(session) {
    setSelectedSession(session);
    setMissionMeta(null);
    setSelectedNPC(null);
    setNPCState(null);

    if (!session) return;

    refreshPlayers(session.id);
    refreshEvents(session.id);
    refreshMessages(session.id);
    fetchMissionMeta(session);
  }

  async function fetchMissionMeta(session) {
    if (!session?.mission_id) return;
    setLoadingMissionMeta(true);
    try {
      const mission = await fetchMissionById(session.mission_id);
      setMissionMeta(mission || null);
    } catch (err) {
      console.error("Failed loading mission meta:", err);
    } finally {
      setLoadingMissionMeta(false);
    }
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

      await loadMissions();
      setSelectedMissionId(mission.id);

      setShowNewCampaignModal(false);
      setNewCampaignName("");
      setNewCampaignRegion("");
      setNewCampaignSummaryKnown("");
      setNewCampaignSummaryUnknown("");
    } catch (err) {
      console.error("Failed creating campaign:", err);
      alert("Failed to create campaign. Check logs.");
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

      const session = await createSession(selectedMissionId, name, "");

      await loadSessions();
      await handleSelectSession(session);
    } catch (err) {
      console.error("Failed creating session:", err);
    }
  }

  // players
  async function refreshPlayers(sessionId) {
    setLoadingPlayers(true);
    try {
      const players = await listSessionPlayers(sessionId);
      setPlayerList(players || []);
    } catch (err) {
      console.error("Failed loading players:", err);
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
    } catch (err) {
      console.error("Failed adding player:", err);
    }
  }

  async function handleRemovePlayer(player) {
    if (!selectedSession) return;
    try {
      await removePlayer(selectedSession.id, player.phone_number);
      refreshPlayers(selectedSession.id);
    } catch (err) {
      console.error("Failed removing player:", err);
    }
  }

  // events
  async function refreshEvents(sessionId) {
    setLoadingEvents(true);
    try {
      const events = await listSessionEvents(sessionId);
      setEventList(events || []);
    } catch (err) {
      console.error("Failed loading events:", err);
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
    } catch (err) {
      console.error("Failed saving event:", err);
    }
  }

  async function archiveEvent(evt) {
    if (!selectedSession) return;
    try {
      await archiveSessionEvent(selectedSession.id, evt.id);
      refreshEvents(selectedSession.id);
    } catch (err) {
      console.error("Failed archiving event:", err);
    }
  }

  // NPC state
  async function handleSelectNPC(entry) {
    if (!selectedSession) return;
    setSelectedNPC(entry);
    setLoadingNpcState(true);
    try {
      const state = await getNPCState(selectedSession.id, entry.npc_id);
      setNPCState(state || {});
    } catch (err) {
      console.error("Failed loading NPC state:", err);
    } finally {
      setLoadingNpcState(false);
    }
  }

  // messages
  async function refreshMessages(sessionId) {
    setLoadingMessages(true);
    try {
      const msgs = await listSessionMessages(sessionId);
      setMessageList(msgs || []);
    } catch (err) {
      console.error("Failed loading messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  }

  // director prompt preview
  const directorPromptPreview = useMemo(() => {
    if (!selectedSession || !selectedNPC) {
      return "Select a session and an NPC from the roster to see the Director prompt.";
    }

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
      `You are ${npcName}, the mission Director in a modern horror / conspiracy campaign.`,
      "",
      "MISSION (PLAYER-KNOWN):",
      summaryKnown,
      "",
      "MISSION (GM SECRET):",
      summaryUnknown,
      "",
      "CAMPAIGN META:",
      `- Name: ${missionName}`,
      `- Region: ${region}`,
      "",
      "RECENT MESSAGES:",
      recentLines || "(no messages yet)",
      "",
      "Stay in-character and never break immersion.",
    ].join("\n");
  }, [selectedSession, selectedNPC, missionMeta, messageList]);

  const hasSession = !!selectedSession;

  return (
    <div className="mission-manager">
      {/* Header */}
      <div className="mm-header-row">
        <h1>Campaign Manager</h1>
        <div className="mm-header-meta">
          {hasSession && (
            <span className="mm-session-pill">
              Active Session: <strong>{selectedSession.session_name}</strong>
            </span>
          )}
          <button
            className={`mm-logs-toggle ${showInspector ? "active" : ""}`}
            onClick={() => setShowInspector((v) => !v)}
          >
            GM LOGS
          </button>
        </div>
      </div>

      {/* Tabs */}
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
          {/* Sessions tab */}
          {activeTab === "sessions" && (
            <>
              <h2>Campaign Sessions</h2>

              <h3>Select Campaign</h3>

              {loadingMissions && <SkeletonRow width="85%" />}

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
                  <option value="__create_new__">➕ Create New Campaign…</option>
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

              {!loadingSessions && !sessionList.length && (
                <p className="mm-note">No sessions found.</p>
              )}

              {!loadingSessions && !!sessionList.length && (
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
                          : "Unknown"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Players tab */}
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

              {!loadingPlayers && !playerList.length && (
                <p className="mm-note">No players in this session yet.</p>
              )}

              {!loadingPlayers && !!playerList.length && (
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
              )}
            </>
          )}

          {/* Events tab */}
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

              {!loadingEvents && !eventList.length && (
                <p className="mm-note">No events yet.</p>
              )}

              {!loadingEvents && !!eventList.length && (
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
                      <div className="mm-event-summary">{ev.summary}</div>
                      <div className="mm-event-sub">
                        {ev.created_at
                          ? new Date(ev.created_at).toLocaleString()
                          : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* NPC tab */}
          {activeTab === "npc" && hasSession && (
            <>
              <h2>Campaign NPC Roster</h2>

              <div className="mm-session-list">
                {campaignNPCs.map((entry) => (
                  <div
                    key={entry.id}
                    className={`mm-session-row ${
                      selectedNPC?.npc_id === entry.npc_id ? "selected" : ""
                    }`}
                  >
                    <div
                      className="mm-session-title"
                      onClick={() => handleSelectNPC(entry)}
                    >
                      {entry.display_name}
                    </div>
                    <div className="mm-session-sub">
                      {entry.primary_category || ""}
                    </div>
                    <button
                      className="mm-btn"
                      onClick={() => handleRemoveNPCFromCampaign(entry)}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {!campaignNPCs.length && (
                  <p className="mm-note">
                    No NPCs attached to this campaign yet.
                  </p>
                )}
              </div>

              <h3 style={{ marginTop: "1rem" }}>Available NPCs</h3>

              <div
                className="mm-session-actions"
                style={{ marginBottom: "0.5rem" }}
              >
                <button
                  className="mm-btn"
                  onClick={() => setShowNewNPCModal(true)}
                >
                  + New NPC
                </button>
              </div>

              <div className="mm-session-list">
                {availableNPCs.map((npc) => (
                  <div key={npc.id} className="mm-session-row">
                    <div className="mm-session-title">{npc.display_name}</div>
                    <div className="mm-session-sub">
                      {npc.primary_category || ""}
                    </div>
                    <button
                      className="mm-btn"
                      onClick={() => handleAddNPCToCampaign(npc)}
                    >
                      Add
                    </button>
                  </div>
                ))}

                {!availableNPCs.length && (
                  <p className="mm-note">
                    All NPCs are already in this campaign.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="mm-right-panel">
          {/* Event editor */}
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
                    setEditingEvent({
                      ...editingEvent,
                      payload: parsed,
                    });
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

          {/* NPC memory view */}
          {activeTab === "npc" && selectedNPC && (
            <div className="mm-panel-card">
              <h2>{selectedNPC.display_name}</h2>
              <p className="mm-note">
                Memory is per session and per phone number. New sessions start
                fresh for new groups.
              </p>

              {loadingNpcState && <SkeletonBlock height="200px" />}

              {!loadingNpcState && (
                <pre className="mm-event-json">
                  {JSON.stringify(npcState || {}, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* default empty state */}
          {((activeTab === "sessions" && !editingEvent) ||
            (activeTab === "players" && !editingEvent) ||
            (activeTab === "events" && !editingEvent) ||
            (activeTab === "npc" && !selectedNPC)) && (
            <div className="mm-panel-card mm-panel-empty">
              <p className="mm-note">
                Select a session, event, or NPC to view details.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* GM logs inspector */}
      <div className={`mm-logs-panel ${showInspector ? "open" : ""}`}>
        <div className="mm-logs-header">
          <div>
            <strong>GM Logs / Debug Console</strong>
            <div className="mm-logs-sub">
              For Keeper / GM use only. Not visible to players.
            </div>
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
                    session: selectedSession || null,
                    mission: missionMeta || null,
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
              {JSON.stringify(playerList || [], null, 2)}
            </pre>
          </section>

          <section className="mm-logs-section">
            <h3>Events</h3>
            <pre className="mm-logs-pre">
              {JSON.stringify(eventList || [], null, 2)}
            </pre>
          </section>

          <section className="mm-logs-section">
            <h3>Messages (last 100)</h3>
            {!loadingMessages ? (
              <pre className="mm-logs-pre">
                {JSON.stringify((messageList || []).slice(-100), null, 2)}
              </pre>
            ) : (
              <SkeletonBlock height="120px" />
            )}
          </section>

          <section className="mm-logs-section">
            <h3>NPC Memory</h3>
            <pre className="mm-logs-pre">
              {JSON.stringify(npcState || {}, null, 2)}
            </pre>
          </section>

          <section className="mm-logs-section">
            <h3>Director System Prompt (Preview)</h3>
            <pre className="mm-logs-pre">{directorPromptPreview}</pre>
          </section>
        </div>
      </div>

      {/* New campaign modal */}
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
              onChange={(e) =>
                setNewCampaignSummaryKnown(e.target.value)
              }
            />

            <label>Summary (GM-Only Secrets)</label>
            <textarea
              value={newCampaignSummaryUnknown}
              onChange={(e) =>
                setNewCampaignSummaryUnknown(e.target.value)
              }
            />

            <div className="mm-modal-actions">
              <button
                className="mm-btn"
                onClick={handleCreateNewCampaign}
              >
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

      {/* New NPC modal */}
      {showNewNPCModal && (
        <div className="mm-modal-backdrop">
          <div className="mm-modal mm-modal-npc">
            <h2>New NPC</h2>

            <label>Display Name *</label>
            <input
              type="text"
              value={npcDisplayName}
              onChange={(e) => setNpcDisplayName(e.target.value)}
            />

            <label>True Name</label>
            <input
              type="text"
              value={npcTrueName}
              onChange={(e) => setNpcTrueName(e.target.value)}
            />

            <label>Primary Category</label>
            <input
              type="text"
              value={npcPrimaryCategory}
              onChange={(e) => setNpcPrimaryCategory(e.target.value)}
              placeholder="DIRECTOR, HANDLER, CONTACT, etc."
            />

            <label>Secondary Subtype</label>
            <input
              type="text"
              value={npcSecondarySubtype}
              onChange={(e) => setNpcSecondarySubtype(e.target.value)}
              placeholder="BARTENDER, COP, CULTIST, etc."
            />

            <label>Intent</label>
            <input
              type="text"
              value={npcIntent}
              onChange={(e) => setNpcIntent(e.target.value)}
              placeholder="protect players, test loyalty, mislead, etc."
            />

            <label>Public Description</label>
            <textarea
              value={npcDescriptionPublic}
              onChange={(e) =>
                setNpcDescriptionPublic(e.target.value)
              }
              placeholder="What players initially see / know."
            />

            <label>Secret Description (GM Only)</label>
            <textarea
              value={npcDescriptionSecret}
              onChange={(e) =>
                setNpcDescriptionSecret(e.target.value)
              }
              placeholder="Hidden background, true motives, connections."
            />

            <label>Goals</label>
            <textarea
              value={npcGoalsText}
              onChange={(e) => setNpcGoalsText(e.target.value)}
              placeholder="What this NPC ultimately wants."
            />

            <label>Secrets</label>
            <textarea
              value={npcSecretsText}
              onChange={(e) => setNpcSecretsText(e.target.value)}
              placeholder="Specific secrets they hold."
            />

            <label>Tone / Voice Notes</label>
            <textarea
              value={npcToneText}
              onChange={(e) => setNpcToneText(e.target.value)}
              placeholder="How they speak, mannerisms, vibe."
            />

            <label>Personality JSON</label>
            <textarea
              className={npcJsonValid ? "" : "mm-json-error"}
              value={npcPersonalityJson}
              onChange={(e) =>
                setNpcPersonalityJson(e.target.value)
              }
              placeholder='e.g. { "traits": ["paranoid","helpful"], "fears": ["exposure"] }'
            />

            <label>Truth Policy JSON</label>
            <textarea
              className={npcJsonValid ? "" : "mm-json-error"}
              value={npcTruthPolicyJson}
              onChange={(e) =>
                setNpcTruthPolicyJson(e.target.value)
              }
              placeholder='e.g. { "will_lie_about": ["employer"], "always_truthful_about": ["monsters"] }'
            />

            <label>GM Notes</label>
            <textarea
              value={npcNotes}
              onChange={(e) => setNpcNotes(e.target.value)}
              placeholder="Any extra meta notes for you as GM."
            />

            <div className="mm-modal-actions">
              <button
                className="mm-btn"
                onClick={handleCreateNewNPC}
              >
                Save NPC
              </button>
              <button
                className="mm-btn mm-btn-secondary"
                onClick={() => setShowNewNPCModal(false)}
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
