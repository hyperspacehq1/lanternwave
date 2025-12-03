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
  // These must exist in src/lib/mission-api.js:
  // createCampaign  -> POST /api-missions
  // createEvent     -> POST /api-events
  // createNPC       -> POST /api-npcs
  // assignNPCToMission -> POST /api-mission-npcs
  // updateNPCState  -> POST /api-npc-state
  createCampaign,
  createEvent,
  createNPC,
  assignNPCToMission,
  updateNPCState,
} from "../lib/mission-api";

import "./mission-manager.css";

export default function MissionManagerPage() {
  // High-level entities
  const [campaigns, setCampaigns] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  // Session-scoped data
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [events, setEvents] = useState([]);
  const [npcList, setNpcList] = useState([]);
  const [missionNPCs, setMissionNPCs] = useState([]);
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [npcState, setNpcState] = useState(null);

  // Creation / input state
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newSessionName, setNewSessionName] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");

  const [newEventType, setNewEventType] = useState("host_message");
  const [newEventBody, setNewEventBody] = useState("");

  const [newNpcDisplayName, setNewNpcDisplayName] = useState("");
  const [newNpcTrueName, setNewNpcTrueName] = useState("");
  const [newNpcPublicDesc, setNewNpcPublicDesc] = useState("");
  const [npcImportText, setNpcImportText] = useState("");
  const [npcStateText, setNpcStateText] = useState("");

  // Tabs
  const [activeTimelineTab, setActiveTimelineTab] = useState("events"); // "events" | "messages"
  const [activeRightTab, setActiveRightTab] = useState("npcs"); // "npcs" | "players"

  // Initial load
  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      const data = await listCampaigns();
      setCampaigns(Array.isArray(data) ? data : data?.missions || []);
    } catch (err) {
      console.error("Error loading campaigns", err);
      setCampaigns([]);
    }
  }

  async function loadSessionsForCampaign(campaign) {
    if (!campaign) return;
    try {
      const data = await listSessions(campaign.id);
      setSessions(Array.isArray(data) ? data : data?.sessions || []);
    } catch (err) {
      console.error("Error loading sessions", err);
      setSessions([]);
    }
  }

  async function loadPlayersForSession(session) {
    if (!session) return;
    try {
      const res = await listSessionPlayers(session.id);
      const list = Array.isArray(res) ? res : res.players || [];
      setPlayers(list);
    } catch (err) {
      console.error("Error loading players", err);
      setPlayers([]);
    }
  }

  async function loadMessagesForSession(session) {
    if (!session) return;
    try {
      const res = await listSessionMessages(session.id);
      let list;
      if (Array.isArray(res)) {
        list = res;
      } else if (res && Array.isArray(res.messages)) {
        list = res.messages;
      } else if (res && Array.isArray(res.logs)) {
        list = res.logs;
      } else {
        list = [];
      }
      setMessages(list);
    } catch (err) {
      console.error("Error loading messages", err);
      setMessages([]);
    }
  }

  async function loadEventsForSession(session) {
    if (!session) return;
    try {
      const resp = await fetch(
        `/.netlify/functions/api-events?session_id=${encodeURIComponent(
          session.id
        )}`
      );
      if (!resp.ok) {
        console.error("Error loading events", await resp.text());
        setEvents([]);
        return;
      }
      const data = await resp.json();
      const list = Array.isArray(data) ? data : data.events || [];
      setEvents(list);
    } catch (err) {
      console.error("Error loading events", err);
      setEvents([]);
    }
  }

  async function loadNPCsGlobal() {
    try {
      const res = await listNPCs();
      const list = Array.isArray(res) ? res : res.npcs || [];
      setNpcList(list);
    } catch (err) {
      console.error("Error loading NPCs", err);
      setNpcList([]);
    }
  }

  async function loadMissionNPCsForCampaign(campaign) {
    if (!campaign) {
      setMissionNPCs([]);
      return;
    }
    try {
      const resp = await fetch(
        `/.netlify/functions/api-mission-npcs?mission_id=${encodeURIComponent(
          campaign.id
        )}`
      );
      if (!resp.ok) {
        console.error("Error loading mission NPCs", await resp.text());
        setMissionNPCs([]);
        return;
      }
      const data = await resp.json();
      const list = Array.isArray(data)
        ? data
        : data.mission_npcs || data.missionNpc || [];
      setMissionNPCs(list);
    } catch (err) {
      console.error("Error loading mission NPCs", err);
      setMissionNPCs([]);
    }
  }

  async function loadNpcStateForSelection(session, npc) {
    if (!session || !npc) {
      setNpcState(null);
      setNpcStateText("");
      return;
    }
    try {
      const res = await getNPCState(session.id, npc.id);
      // Res might be a row with a "state" property, or just the state object.
      const stateObj =
        res && typeof res === "object" && "state" in res ? res.state : res || {};
      setNpcState(stateObj);
      setNpcStateText(JSON.stringify(stateObj, null, 2));
    } catch (err) {
      console.error("Error loading NPC state", err);
      setNpcState(null);
      setNpcStateText("");
    }
  }

  // High-level selection handlers
  async function handleSelectCampaign(campaign) {
    setSelectedCampaign(campaign);
    setSelectedSession(null);
    setSessions([]);
    setPlayers([]);
    setMessages([]);
    setEvents([]);
    setMissionNPCs([]);
    setSelectedNPC(null);
    setNpcList([]);
    setNpcState(null);
    setNpcStateText("");

    await Promise.all([
      loadSessionsForCampaign(campaign),
      loadMissionNPCsForCampaign(campaign),
      loadNPCsGlobal(),
    ]);
  }

  async function handleSelectSession(session) {
    setSelectedSession(session);
    setPlayers([]);
    setMessages([]);
    setEvents([]);
    setSelectedNPC(null);
    setNpcState(null);
    setNpcStateText("");

    await Promise.all([
      loadPlayersForSession(session),
      loadMessagesForSession(session),
      loadEventsForSession(session),
      loadNPCsGlobal(),
    ]);
  }

  // Creation handlers
  async function handleCreateCampaign() {
    if (!newCampaignName.trim()) return;
    try {
      const res = await createCampaign({ name: newCampaignName.trim() });
      const mission = res?.mission || res;
      if (mission) {
        setCampaigns((prev) => [...prev, mission]);
      }
      setNewCampaignName("");
    } catch (err) {
      console.error("Error creating campaign", err);
    }
  }

  async function handleCreateSession() {
    if (!selectedCampaign || !newSessionName.trim()) return;
    try {
      const res = await createSession(selectedCampaign.id, newSessionName.trim());
      const session = res?.session || res;
      if (session) {
        setSessions((prev) => [...prev, session]);
      }
      setNewSessionName("");
    } catch (err) {
      console.error("Error creating session", err);
    }
  }

  async function handleAddPlayer() {
    if (!selectedSession || !newPlayerNumber.trim()) return;
    try {
      await addSessionPlayer(selectedSession.id, {
        phone_number: newPlayerNumber.trim(),
        player_name: newPlayerName.trim() || null,
      });
      await loadPlayersForSession(selectedSession);
      setNewPlayerName("");
      setNewPlayerNumber("");
    } catch (err) {
      console.error("Error adding player", err);
    }
  }

  async function handleRemovePlayer(player) {
    if (!selectedSession) return;
    try {
      const phone =
        typeof player === "string"
          ? player
          : player.phone_number || player.phone || "";
      if (!phone) return;
      await removeSessionPlayer(selectedSession.id, phone);
      await loadPlayersForSession(selectedSession);
    } catch (err) {
      console.error("Error removing player", err);
    }
  }

  async function handleCreateEvent() {
    if (!selectedSession || !newEventType.trim()) return;
    try {
      const payload = {
        body: newEventBody,
      };
      await createEvent({
        session_id: selectedSession.id,
        event_type: newEventType.trim(),
        payload,
      });
      setNewEventBody("");
      await loadEventsForSession(selectedSession);
    } catch (err) {
      console.error("Error creating event", err);
    }
  }

  async function handleArchiveEvent(eventRow) {
    if (!selectedSession || !eventRow) return;
    try {
      // archiveSessionEvent signature is defined in mission-api;
      // here we assume it takes the event id only.
      await archiveSessionEvent(eventRow.id);
      await loadEventsForSession(selectedSession);
    } catch (err) {
      console.error("Error archiving event", err);
    }
  }

  // NPC handlers
  function handleSelectNPC(npc) {
    setSelectedNPC(npc);
    loadNpcStateForSelection(selectedSession, npc);
  }

  async function handleCreateNPC() {
    if (!newNpcDisplayName.trim() || !newNpcTrueName.trim()) return;
    try {
      const payload = {
        display_name: newNpcDisplayName.trim(),
        true_name: newNpcTrueName.trim(),
        description_public: newNpcPublicDesc.trim() || null,
      };
      await createNPC(payload);
      setNewNpcDisplayName("");
      setNewNpcTrueName("");
      setNewNpcPublicDesc("");
      await loadNPCsGlobal();
    } catch (err) {
      console.error("Error creating NPC", err);
    }
  }

  async function handleImportNPC() {
    if (!npcImportText.trim()) return;
    try {
      const parsed = JSON.parse(npcImportText);
      const payload = {
        display_name: parsed.display_name || parsed.name || parsed.true_name,
        true_name: parsed.true_name || parsed.name || parsed.display_name,
        description_public:
          parsed.description_public || parsed.short_bio || parsed.bio || null,
        primary_category: parsed.primary_category || null,
        secondary_subtype: parsed.secondary_subtype || null,
        intent: parsed.intent || null,
        personality_json: parsed.personality_json || null,
        goals_text: parsed.goals_text || null,
        secrets_text: parsed.secrets_text || null,
        tone_text: parsed.tone_text || null,
        truth_policy_json: parsed.truth_policy_json || null,
      };
      await createNPC(payload);
      setNpcImportText("");
      await loadNPCsGlobal();
    } catch (err) {
      console.error("Invalid NPC JSON or error creating NPC", err);
      alert("Invalid NPC JSON or error creating NPC. See console for details.");
    }
  }

  async function handleAssignNpcToMission(npc) {
    const campaign = selectedCampaign;
    if (!campaign || !npc) return;
    try {
      await assignNPCToMission({
        mission_id: campaign.id,
        npc_id: npc.id,
        is_known: true,
      });
      await loadMissionNPCsForCampaign(campaign);
    } catch (err) {
      console.error("Error assigning NPC to mission", err);
    }
  }

  async function handleSaveNpcState() {
    if (!selectedSession || !selectedNPC) return;
    try {
      let parsed;
      try {
        parsed = npcStateText.trim() ? JSON.parse(npcStateText) : {};
      } catch (err) {
        alert("NPC state JSON is invalid.");
        return;
      }
      await updateNPCState({
        session_id: selectedSession.id,
        npc_id: selectedNPC.id,
        state: parsed,
      });
      setNpcState(parsed);
    } catch (err) {
      console.error("Error saving NPC state", err);
    }
  }

  const hasSelection = selectedCampaign && selectedSession;

  return (
    <div className="mission-manager">
      {/* Top context bar */}
      <header className="mm-header">
        <div className="mm-context">
          <div className="mm-context-left">
            <div className="mm-context-row">
              <span className="mm-context-label">Campaign</span>
              <span className="mm-context-value">
                {selectedCampaign ? selectedCampaign.name : "None selected"}
              </span>
            </div>
            <div className="mm-context-row">
              <span className="mm-context-label">Session</span>
              <span className="mm-context-value">
                {selectedSession ? selectedSession.session_name : "None selected"}
              </span>
            </div>
          </div>

          <div className="mm-context-right">
            <span className="mm-badge">Campaigns: {campaigns.length}</span>
            <span className="mm-badge">Sessions: {sessions.length}</span>
            <span className="mm-badge">Players: {players.length}</span>
            <span className="mm-badge">NPCs: {npcList.length}</span>
          </div>
        </div>
      </header>

      {/* 2x2 grid */}
      <div className="mm-grid">
        {/* CAMPAIGNS PANEL --------------------------------------------------- */}
        <section className="mm-panel">
          <h2 className="mm-panel-title">Campaigns</h2>

          <div className="mm-panel-body mm-scrollable">
            {campaigns.map((c) => (
              <button
                key={c.id}
                type="button"
                className={
                  "mm-item-button" +
                  (selectedCampaign && selectedCampaign.id === c.id
                    ? " selected"
                    : "")
                }
                onClick={() => handleSelectCampaign(c)}
              >
                <div className="mm-item-title">{c.name}</div>
                {c.mission_id_code && (
                  <div className="mm-item-sub">{c.mission_id_code}</div>
                )}
              </button>
            ))}
            {campaigns.length === 0 && (
              <div className="mm-placeholder">
                No campaigns yet. Create one below.
              </div>
            )}
          </div>

          <div className="mm-panel-footer">
            <div className="mm-footer-title">Create Campaign</div>
            <input
              className="mm-input"
              placeholder="Campaign Name"
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
            />
            <button className="mm-btn" onClick={handleCreateCampaign}>
              Add Campaign
            </button>
          </div>
        </section>

        {/* SESSIONS PANEL ---------------------------------------------------- */}
        <section className="mm-panel">
          <h2 className="mm-panel-title">Sessions</h2>

          <div className="mm-panel-body mm-scrollable">
            {sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                className={
                  "mm-item-button" +
                  (selectedSession && selectedSession.id === s.id
                    ? " selected"
                    : "")
                }
                onClick={() => handleSelectSession(s)}
              >
                <div className="mm-item-title">{s.session_name}</div>
                <div className="mm-item-sub">{s.status || "new"}</div>
              </button>
            ))}

            {sessions.length === 0 && selectedCampaign && (
              <div className="mm-placeholder">
                No sessions for this campaign yet. Create one below.
              </div>
            )}

            {!selectedCampaign && (
              <div className="mm-placeholder">
                Select a campaign to view its sessions.
              </div>
            )}
          </div>

          <div className="mm-panel-footer">
            <div className="mm-footer-title">Create Session</div>
            <input
              className="mm-input"
              placeholder="Session Name"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              disabled={!selectedCampaign}
            />
            <button
              className="mm-btn"
              onClick={handleCreateSession}
              disabled={!selectedCampaign}
            >
              Add Session
            </button>
          </div>
        </section>

        {/* TIMELINE PANEL (EVENTS / MESSAGES) -------------------------------- */}
        <section className="mm-panel mm-panel-tall">
          <div className="mm-panel-header-with-tabs">
            <h2 className="mm-panel-title">Timeline</h2>
            <div className="mm-tabs">
              <button
                type="button"
                className={
                  "mm-tab" + (activeTimelineTab === "events" ? " active" : "")
                }
                onClick={() => setActiveTimelineTab("events")}
              >
                Events
              </button>
              <button
                type="button"
                className={
                  "mm-tab" + (activeTimelineTab === "messages" ? " active" : "")
                }
                onClick={() => setActiveTimelineTab("messages")}
              >
                Host Messages
              </button>
            </div>
          </div>

          <div className="mm-panel-body mm-scrollable">
            {!hasSelection && (
              <div className="mm-placeholder">
                Select a campaign and session to view timeline.
              </div>
            )}

            {hasSelection && activeTimelineTab === "events" && (
              <>
                {events.length === 0 && (
                  <div className="mm-placeholder">
                    No events yet for this session.
                  </div>
                )}
                {events.map((ev) => (
                  <div key={ev.id} className="mm-event-item">
                    <div className="mm-event-main">
                      <div className="mm-event-type">
                        {ev.event_type || ev.type || "event"}
                      </div>
                      {ev.payload && (
                        <div className="mm-event-body">
                          {typeof ev.payload === "string"
                            ? ev.payload
                            : ev.payload.body || JSON.stringify(ev.payload)}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="mm-btn-small"
                      onClick={() => handleArchiveEvent(ev)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </>
            )}

            {hasSelection && activeTimelineTab === "messages" && (
              <>
                {messages.length === 0 && (
                  <div className="mm-placeholder">
                    No host messages yet for this session.
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div key={msg.id || idx} className="mm-message-item">
                    <div className="mm-message-meta">
                      <span className="mm-message-from">
                        {msg.from_label || msg.from || "Host"}
                      </span>
                      {msg.created_at && (
                        <span className="mm-message-time">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="mm-message-body">
                      {msg.body || msg.text || JSON.stringify(msg)}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {hasSelection && activeTimelineTab === "events" && (
            <div className="mm-panel-footer">
              <div className="mm-footer-title">Create Event</div>
              <select
                className="mm-input"
                value={newEventType}
                onChange={(e) => setNewEventType(e.target.value)}
              >
                <option value="host_message">Host Message</option>
                <option value="sms">SMS</option>
                <option value="system_note">System Note</option>
              </select>
              <textarea
                className="mm-input mm-textarea"
                rows={3}
                placeholder="Event body / payload"
                value={newEventBody}
                onChange={(e) => setNewEventBody(e.target.value)}
              />
              <button className="mm-btn" onClick={handleCreateEvent}>
                Add Event
              </button>
            </div>
          )}
        </section>

        {/* NPCs / PLAYERS PANEL ---------------------------------------------- */}
        <section className="mm-panel mm-panel-tall">
          <div className="mm-panel-header-with-tabs">
            <h2 className="mm-panel-title">NPCs &amp; Players</h2>
            <div className="mm-tabs">
              <button
                type="button"
                className={
                  "mm-tab" + (activeRightTab === "npcs" ? " active" : "")
                }
                onClick={() => setActiveRightTab("npcs")}
              >
                NPCs
              </button>
              <button
                type="button"
                className={
                  "mm-tab" + (activeRightTab === "players" ? " active" : "")
                }
                onClick={() => setActiveRightTab("players")}
              >
                Players
              </button>
            </div>
          </div>

          <div className="mm-panel-body mm-scrollable">
            {!hasSelection && (
              <div className="mm-placeholder">
                Select a campaign and session to manage NPCs and players.
              </div>
            )}

            {hasSelection && activeRightTab === "npcs" && (
              <div className="mm-npc-layout">
                {/* Global NPC Library */}
                <div className="mm-npc-block">
                  <div className="mm-section-title">Global NPCs</div>
                  {npcList.length === 0 && (
                    <div className="mm-placeholder">
                      No NPCs yet. Create one below or import JSON.
                    </div>
                  )}
                  {npcList.map((npc) => (
                    <div
                      key={npc.id}
                      className={
                        "mm-npc-item" +
                        (selectedNPC && selectedNPC.id === npc.id
                          ? " selected"
                          : "")
                      }
                    >
                      <div className="mm-npc-main">
                        <div className="mm-npc-name">
                          {npc.display_name ||
                            npc.true_name ||
                            `NPC #${npc.id}`}
                        </div>
                        {npc.primary_category && (
                          <div className="mm-npc-tag">
                            {npc.primary_category}
                          </div>
                        )}
                      </div>
                      <div className="mm-npc-actions">
                        <button
                          type="button"
                          className="mm-btn-small"
                          onClick={() => handleSelectNPC(npc)}
                        >
                          Select
                        </button>
                        <button
                          type="button"
                          className="mm-btn-small"
                          onClick={() => handleAssignNpcToMission(npc)}
                          disabled={!selectedCampaign}
                        >
                          Add to Mission
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mission NPCs */}
                <div className="mm-npc-block">
                  <div className="mm-section-title">Mission NPCs</div>
                  {missionNPCs.length === 0 && (
                    <div className="mm-placeholder">
                      No NPCs assigned to this mission yet.
                    </div>
                  )}
                  {missionNPCs.map((mn) => {
                    const npc =
                      npcList.find((n) => n.id === mn.npc_id) || mn;
                    return (
                      <div
                        key={mn.id || `${mn.mission_id}-${mn.npc_id}`}
                        className="mm-npc-item"
                      >
                        <div className="mm-npc-main">
                          <div className="mm-npc-name">
                            {npc.display_name ||
                              npc.true_name ||
                              `NPC #${npc.id || mn.npc_id}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Create NPC */}
                <div className="mm-npc-block">
                  <div className="mm-section-title">Create NPC</div>
                  <input
                    className="mm-input"
                    placeholder="Display Name"
                    value={newNpcDisplayName}
                    onChange={(e) => setNewNpcDisplayName(e.target.value)}
                  />
                  <input
                    className="mm-input"
                    placeholder="True Name"
                    value={newNpcTrueName}
                    onChange={(e) => setNewNpcTrueName(e.target.value)}
                  />
                  <textarea
                    className="mm-input mm-textarea"
                    rows={3}
                    placeholder="Public description"
                    value={newNpcPublicDesc}
                    onChange={(e) => setNewNpcPublicDesc(e.target.value)}
                  />
                  <button className="mm-btn" onClick={handleCreateNPC}>
                    Add NPC
                  </button>
                </div>

                {/* Import NPC JSON */}
                <div className="mm-npc-block">
                  <div className="mm-section-title">Import NPC JSON</div>
                  <textarea
                    className="mm-input mm-textarea"
                    rows={4}
                    placeholder='Paste NPC JSON here: { "display_name": "...", "true_name": "...", ... }'
                    value={npcImportText}
                    onChange={(e) => setNpcImportText(e.target.value)}
                  />
                  <button className="mm-btn" onClick={handleImportNPC}>
                    Import NPC
                  </button>
                </div>

                {/* NPC State */}
                <div className="mm-npc-block">
                  <div className="mm-section-title">
                    NPC State (Session Memory)
                  </div>
                  {!selectedNPC && (
                    <div className="mm-placeholder">
                      Select an NPC to view or edit its session state.
                    </div>
                  )}
                  {selectedNPC && (
                    <>
                      <div className="mm-npc-state-label">
                        Editing state for:{" "}
                        {selectedNPC.display_name ||
                          selectedNPC.true_name ||
                          `NPC #${selectedNPC.id}`}
                      </div>
                      <textarea
                        className="mm-input mm-textarea"
                        rows={6}
                        value={npcStateText}
                        onChange={(e) => setNpcStateText(e.target.value)}
                      />
                      <button
                        className="mm-btn"
                        onClick={handleSaveNpcState}
                      >
                        Save NPC State
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {hasSelection && activeRightTab === "players" && (
              <div className="mm-players-layout">
                <div className="mm-section-title">Session Players</div>
                {players.length === 0 && (
                  <div className="mm-placeholder">
                    No players yet. Add one below.
                  </div>
                )}
                {players.map((p) => (
                  <div
                    key={p.phone_number || p.phone || JSON.stringify(p)}
                    className="mm-player-item"
                  >
                    <div className="mm-player-main">
                      <div className="mm-player-name">
                        {p.player_name || "(Unnamed Player)"}
                      </div>
                      <div className="mm-player-phone">
                        {p.phone_number || p.phone}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mm-btn-small"
                      onClick={() => handleRemovePlayer(p)}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <div className="mm-add-player">
                  <div className="mm-section-title">Add Player</div>
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
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
