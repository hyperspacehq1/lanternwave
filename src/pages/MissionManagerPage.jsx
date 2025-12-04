import React, { useState, useEffect } from "react";
import {
  listCampaigns,
  listSessions,
  createSession,
  listSessionPlayers,
  addSessionPlayer,
  removeSessionPlayer,
  listNPCs,
  getNPCState,
  createCampaign,
  createEvent,
  createNPC,
  assignNPCToMission,
  updateNPCState,
  listMissionEvents,
  archiveMissionEvent,
} from "../lib/mission-api";

import "./mission-manager.css";

// Weather options from your spec
const WEATHER_OPTIONS = [
  "Clear / Sunny",
  "Partly Cloudy",
  "Cloudy / Overcast",
  "Rain",
  "Thunderstorms",
  "Snow",
  "Sleet / Freezing Rain",
  "Windy",
  "Fog / Mist",
  "Haze / Smoke",
  "Tropical Storm / Hurricane",
];

// Event types from your Event Doc
const EVENT_TYPES = [
  "Discovery / Exploration Event",
  "Social / Diplomacy Event",
  "Combat / Hostile Encounter",
  "Environmental Challenge",
  "Investigation / Mystery Event",
  "Resource / Survival Event",
  "Moral / Ethical Dilemma",
  "Character-Focused Event",
  "Major Plot Twist",
  "Reward / Progression Moment",
];

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

  // Campaign creation fields
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newMissionIdCode, setNewMissionIdCode] = useState("");
  const [newMissionSummaryKnown, setNewMissionSummaryKnown] = useState("");
  const [newMissionSummaryUnknown, setNewMissionSummaryUnknown] =
    useState("");
  const [newMissionRegion, setNewMissionRegion] = useState("");
  const [newMissionWeather, setNewMissionWeather] = useState("");
  const [newMissionDate, setNewMissionDate] = useState("");
  const [newMissionAutoCreateSessions, setNewMissionAutoCreateSessions] =
    useState(false);

  // Session creation
  const [newSessionName, setNewSessionName] = useState("");

  // Player creation
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");

  // Event creation (mission-scoped)
  const [newEventType, setNewEventType] = useState(EVENT_TYPES[0]);
  const [eventLocation, setEventLocation] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventGoal, setEventGoal] = useState("");
  const [eventItem, setEventItem] = useState("");

  // NPC creation + import
  const [newNpcDisplayName, setNewNpcDisplayName] = useState("");
  const [newNpcTrueName, setNewNpcTrueName] = useState("");
  const [newNpcPublicDesc, setNewNpcPublicDesc] = useState("");
  const [npcImportText, setNpcImportText] = useState("");

  // NPC state
  const [npcStateText, setNpcStateText] = useState("");

  // Tabs
  const [activeTimelineTab, setActiveTimelineTab] = useState("events"); // events | messages
  const [activeRightTab, setActiveRightTab] = useState("npcs"); // npcs | players

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      const data = await listCampaigns();
      setCampaigns(Array.isArray(data) ? data : data.missions || []);
    } catch (err) {
      console.error("Error loading campaigns", err);
      setCampaigns([]);
    }
  }

  async function loadSessionsForCampaign(campaign) {
    if (!campaign) return;
    try {
      const data = await listSessions(campaign.id);
      setSessions(Array.isArray(data) ? data : data.sessions || []);
    } catch (err) {
      console.error("Error loading sessions", err);
      setSessions([]);
    }
  }

  async function loadPlayersForSession(session) {
    if (!session) return;
    try {
      const list = await listSessionPlayers(session.id);
      setPlayers(Array.isArray(list) ? list : list.players || []);
    } catch (err) {
      console.error("Error loading players", err);
      setPlayers([]);
    }
  }

  async function loadEventsForCampaign(campaign) {
    if (!campaign) return;
    try {
      const res = await listMissionEvents(campaign.id);
      const list = res?.events || [];
      setEvents(list);
    } catch (err) {
      console.error("Error loading events", err);
      setEvents([]);
    }
  }

  async function loadMessagesForSession(session) {
    if (!session) return;
    try {
      const resp = await fetch(
        `/.netlify/functions/api-mission-messages?session_id=${session.id}`
      );
      const data = await resp.json();
      setMessages(
        Array.isArray(data)
          ? data
          : data.messages || data.logs || []
      );
    } catch (err) {
      console.error("Error loading messages", err);
      setMessages([]);
    }
  }

  async function loadNPCsGlobal() {
    try {
      const res = await listNPCs();
      setNpcList(Array.isArray(res) ? res : res.npcs || []);
    } catch (err) {
      console.error("Error loading NPCs", err);
      setNpcList([]);
    }
  }

  async function loadMissionNPCsForCampaign(campaign) {
    if (!campaign) return;
    try {
      const resp = await fetch(
        `/.netlify/functions/api-mission-npcs?mission_id=${campaign.id}`
      );
      const data = await resp.json();
      setMissionNPCs(
        Array.isArray(data)
          ? data
          : data.mission_npcs || []
      );
    } catch (err) {
      console.error("Error loading mission NPCs");
      setMissionNPCs([]);
    }
  }

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
      loadEventsForCampaign(campaign),
    ]);
  }

  async function handleSelectSession(session) {
    setSelectedSession(session);
    setPlayers([]);
    setMessages([]);
    setSelectedNPC(null);

    await Promise.all([
      loadPlayersForSession(session),
      loadMessagesForSession(session),
      loadNPCsGlobal(),
    ]);
  }

  async function handleCreateCampaign() {
    if (!newCampaignName.trim()) return;

    const payload = {
      name: newCampaignName.trim(),
      mission_id_code: newMissionIdCode.trim() || null,
      summary_known: newMissionSummaryKnown.trim() || null,
      summary_unknown: newMissionSummaryUnknown.trim() || null,
      region: newMissionRegion.trim() || null,
      weather: newMissionWeather || null,
      mission_date: newMissionDate || null,
      auto_create_sessions: newMissionAutoCreateSessions,
    };

    try {
      const res = await createCampaign(payload);
      const mission = res?.mission || res;
      setCampaigns((p) => [...p, mission]);

      setNewCampaignName("");
      setNewMissionIdCode("");
      setNewMissionSummaryKnown("");
      setNewMissionSummaryUnknown("");
      setNewMissionRegion("");
      setNewMissionWeather("");
      setNewMissionDate("");
      setNewMissionAutoCreateSessions(false);
    } catch (err) {
      console.error("Error creating campaign", err);
    }
  }

  async function handleCreateSession() {
    if (!selectedCampaign || !newSessionName.trim()) return;
    try {
      const res = await createSession(
        selectedCampaign.id,
        newSessionName.trim()
      );
      const session = res?.session || res;
      setSessions((p) => [...p, session]);
      setNewSessionName("");
    } catch (err) {
      console.error("Error creating session", err);
    }
  }

  async function handleAddPlayer() {
    if (!selectedSession || !newPlayerNumber.trim()) return;
    try {
      await addSessionPlayer({
        session_id: selectedSession.id,
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
      const phone = player.phone_number || player.phone;
      await removeSessionPlayer(selectedSession.id, phone);
      await loadPlayersForSession(selectedSession);
    } catch (err) {
      console.error("Error removing player", err);
    }
  }

  async function handleCreateEvent() {
    if (!selectedCampaign) return;

    await createEvent({
      mission_id: selectedCampaign.id,
      event_type: newEventType,
      location: eventLocation,
      description: eventDescription,
      goal: eventGoal,
      item: eventItem,
    });

    setEventLocation("");
    setEventDescription("");
    setEventGoal("");
    setEventItem("");

    await loadEventsForCampaign(selectedCampaign);
  }

  async function handleArchiveEvent(eventRow) {
    if (!selectedCampaign || !eventRow) return;
    await archiveMissionEvent(selectedCampaign.id, eventRow.id);
    await loadEventsForCampaign(selectedCampaign);
  }

  async function handleCreateNPC() {
    if (!newNpcDisplayName.trim() || !newNpcTrueName.trim()) return;

    await createNPC({
      display_name: newNpcDisplayName,
      true_name: newNpcTrueName,
      description_public: newNpcPublicDesc || null,
    });

    setNewNpcDisplayName("");
    setNewNpcTrueName("");
    setNewNpcPublicDesc("");

    await loadNPCsGlobal();
  }

  async function handleImportNPC() {
    try {
      const parsed = JSON.parse(npcImportText);
      await createNPC({
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
      });

      setNpcImportText("");
      await loadNPCsGlobal();
    } catch (err) {
      alert("Invalid NPC JSON");
    }
  }

  function handleSelectNPC(npc) {
    setSelectedNPC(npc);
    loadNpcStateForSelection(selectedSession, npc);
  }

  async function loadNpcStateForSelection(session, npc) {
    if (!session || !npc) {
      setNpcState(null);
      setNpcStateText("");
      return;
    }
    const res = await getNPCState(session.id, npc.id);
    const stateObj = res?.state || res || {};
    setNpcState(stateObj);
    setNpcStateText(JSON.stringify(stateObj, null, 2));
  }

  async function handleSaveNpcState() {
    if (!selectedSession || !selectedNPC) return;
    try {
      const parsed = npcStateText ? JSON.parse(npcStateText) : {};
      await updateNPCState({
        session_id: selectedSession.id,
        npc_id: selectedNPC.id,
        state: parsed,
      });
      setNpcState(parsed);
    } catch (err) {
      alert("Invalid NPC state JSON");
    }
  }

  return (
    <div className="mission-manager">

      {/* HEADER ------------------------------------------------- */}
      <header className="mm-header">
        <div className="mm-context">
          <div className="mm-context-left">
            <div className="mm-context-row">
              <span className="mm-context-label">Campaign</span>
              <span className="mm-context-value">
                {selectedCampaign?.name || "None"}
              </span>
            </div>

            <div className="mm-context-row">
              <span className="mm-context-label">Session</span>
              <span className="mm-context-value">
                {selectedSession?.session_name || "None"}
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

      {/* GRID --------------------------------------------------- */}
      <div className="mm-grid">

        {/* CAMPAIGNS PANEL ------------------------------------- */}
        <section className="mm-panel">
          <h2 className="mm-panel-title">Campaigns</h2>

          <div className="mm-panel-body mm-scrollable">
            {campaigns.map((c) => (
              <button
                key={c.id}
                className={
                  "mm-item-button" +
                  (selectedCampaign?.id === c.id ? " selected" : "")
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
                No campaigns yet — create one below.
              </div>
            )}
          </div>

          <div className="mm-panel-footer">
            <div className="mm-footer-title">Create Campaign</div>

            <input
              className="mm-input"
              placeholder="Campaign Name (required)"
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
            />

            <input
              className="mm-input"
              placeholder="Mission ID Code"
              value={newMissionIdCode}
              onChange={(e) => setNewMissionIdCode(e.target.value)}
            />

            <input
              className="mm-input"
              placeholder="Region"
              value={newMissionRegion}
              onChange={(e) => setNewMissionRegion(e.target.value)}
            />

            <select
              className="mm-input"
              value={newMissionWeather}
              onChange={(e) => setNewMissionWeather(e.target.value)}
            >
              <option value="">Weather</option>
              {WEATHER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            <input
              className="mm-input"
              type="date"
              value={newMissionDate}
              onChange={(e) => setNewMissionDate(e.target.value)}
            />

            <textarea
              className="mm-input mm-textarea"
              placeholder="Summary (What players know)"
              rows={2}
              value={newMissionSummaryKnown}
              onChange={(e) => setNewMissionSummaryKnown(e.target.value)}
            />

            <textarea
              className="mm-input mm-textarea"
              placeholder="Secret Summary (What is secretly true)"
              rows={2}
              value={newMissionSummaryUnknown}
              onChange={(e) => setNewMissionSummaryUnknown(e.target.value)}
            />

            <label className="mm-checkbox-row">
              <input
                type="checkbox"
                checked={newMissionAutoCreateSessions}
                onChange={(e) =>
                  setNewMissionAutoCreateSessions(e.target.checked)
                }
              />
              <span>Auto-create first session</span>
            </label>

            <button className="mm-btn" onClick={handleCreateCampaign}>
              Add Campaign
            </button>
          </div>
        </section>

        {/* SESSIONS PANEL --------------------------------------- */}
        <section className="mm-panel">
          <h2 className="mm-panel-title">Sessions</h2>

          <div className="mm-panel-body mm-scrollable">
            {sessions.map((s) => (
              <button
                key={s.id}
                className={
                  "mm-item-button" +
                  (selectedSession?.id === s.id ? " selected" : "")
                }
                onClick={() => handleSelectSession(s)}
              >
                <div className="mm-item-title">{s.session_name}</div>
                <div className="mm-item-sub">{s.status}</div>
              </button>
            ))}

            {selectedCampaign && sessions.length === 0 && (
              <div className="mm-placeholder">
                No sessions yet — create one below.
              </div>
            )}
            {!selectedCampaign && (
              <div className="mm-placeholder">
                Select a campaign to view sessions.
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

        {/* TIMELINE PANEL --------------------------------------- */}
        <section className="mm-panel">
          <h2 className="mm-panel-title">Timeline</h2>

          <div className="mm-tab-row">
            <button
              className={`mm-tab ${
                activeTimelineTab === "events" ? "active" : ""
              }`}
              onClick={() => setActiveTimelineTab("events")}
            >
              Events
            </button>

            <button
              className={`mm-tab ${
                activeTimelineTab === "messages" ? "active" : ""
              }`}
              onClick={() => setActiveTimelineTab("messages")}
            >
              Messages
            </button>
          </div>

          <div className="mm-panel-body mm-scrollable">

            {/* EVENTS LIST ----------------------------------- */}
            {activeTimelineTab === "events" &&
              (selectedCampaign ? (
                events.length > 0 ? (
                  events.map((evt) => (
                    <div key={evt.id} className="mm-event-row">
                      <div className="mm-event-type">{evt.event_type}</div>

                      <div className="mm-event-info">
                        {evt.payload?.location && (
                          <div>
                            <strong>Location:</strong> {evt.payload.location}
                          </div>
                        )}
                        {evt.payload?.description && (
                          <div>
                            <strong>Description:</strong>{" "}
                            {evt.payload.description}
                          </div>
                        )}
                        {evt.payload?.goal && (
                          <div>
                            <strong>Goal:</strong> {evt.payload.goal}
                          </div>
                        )}
                        {evt.payload?.item && (
                          <div>
                            <strong>Item:</strong> {evt.payload.item}
                          </div>
                        )}
                      </div>

                      <button
                        className="mm-btn-small"
                        onClick={() => handleArchiveEvent(evt)}
                      >
                        Archive
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="mm-placeholder">
                    No events yet — create one below.
                  </div>
                )
              ) : (
                <div className="mm-placeholder">
                  Select a campaign to view events.
                </div>
              ))}

            {/* MESSAGES LIST --------------------------------- */}
            {activeTimelineTab === "messages" &&
              (selectedSession ? (
                messages.length > 0 ? (
                  messages.map((msg) => (
                    <div key={msg.id} className="mm-message-row">
                      <div className="mm-message-body">{msg.body}</div>
                      <div className="mm-message-time">
                        {new Date(msg.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="mm-placeholder">
                    No messages for this session.
                  </div>
                )
              ) : (
                <div className="mm-placeholder">
                  Select a session to view messages.
                </div>
              ))}
          </div>

          {/* EVENT CREATION FOOTER ----------------------------- */}
          {activeTimelineTab === "events" && (
            <div className="mm-panel-footer">
              <div className="mm-footer-title">Create Event</div>

              <select
                className="mm-input"
                value={newEventType}
                onChange={(e) => setNewEventType(e.target.value)}
                disabled={!selectedCampaign}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <input
                className="mm-input"
                placeholder="Location"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                disabled={!selectedCampaign}
              />

              <textarea
                className="mm-input mm-textarea"
                placeholder="Description"
                rows={2}
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                disabled={!selectedCampaign}
              />

              <textarea
                className="mm-input mm-textarea"
                placeholder="Goal / Outcome"
                rows={2}
                value={eventGoal}
                onChange={(e) => setEventGoal(e.target.value)}
                disabled={!selectedCampaign}
              />

              <input
                className="mm-input"
                placeholder="Item (optional)"
                value={eventItem}
                onChange={(e) => setEventItem(e.target.value)}
                disabled={!selectedCampaign}
              />

              <button
                className="mm-btn"
                onClick={handleCreateEvent}
                disabled={!selectedCampaign}
              >
                Add Event
              </button>
            </div>
          )}
        </section>

        {/* NPC / PLAYERS PANEL -------------------------------- */}
        <section className="mm-panel">
          <h2 className="mm-panel-title">NPCs & Players</h2>

          <div className="mm-tab-row">
            <button
              className={`mm-tab ${
                activeRightTab === "npcs" ? "active" : ""
              }`}
              onClick={() => setActiveRightTab("npcs")}
            >
              NPCs
            </button>

            <button
              className={`mm-tab ${
                activeRightTab === "players" ? "active" : ""
              }`}
              onClick={() => setActiveRightTab("players")}
            >
              Players
            </button>
          </div>

          <div className="mm-panel-body mm-scrollable">

            {/* NPC LIST ------------------------------------ */}
            {activeRightTab === "npcs" && (
              <>
                <div className="mm-subtitle">Mission NPCs</div>
                {missionNPCs.length > 0 ? (
                  missionNPCs.map((npc) => (
                    <button
                      key={npc.id}
                      className={
                        "mm-item-button" +
                        (selectedNPC?.id === npc.id ? " selected" : "")
                      }
                      onClick={() => handleSelectNPC(npc)}
                    >
                      <div className="mm-item-title">{npc.display_name}</div>
                      <div className="mm-item-sub">{npc.true_name}</div>
                    </button>
                  ))
                ) : (
                  <div className="mm-placeholder">
                    No mission NPCs yet — assign one below.
                  </div>
                )}

                <div className="mm-subtitle">Global NPCs</div>
                {npcList.length > 0 ? (
                  npcList.map((npc) => (
                    <button
                      key={npc.id}
                      className="mm-item-button"
                      onClick={() => handleAssignNpcToMission(npc)}
                    >
                      <div className="mm-item-title">{npc.display_name}</div>
                      <div className="mm-item-sub">{npc.true_name}</div>
                    </button>
                  ))
                ) : (
                  <div className="mm-placeholder">
                    No NPCs yet — create or import below.
                  </div>
                )}

                {selectedNPC && (
                  <>
                    <div className="mm-subtitle">NPC State</div>
                    <textarea
                      className="mm-input mm-textarea"
                      rows={6}
                      value={npcStateText}
                      onChange={(e) => setNpcStateText(e.target.value)}
                    />

                    <button
                      className="mm-btn-small"
                      onClick={handleSaveNpcState}
                      disabled={!selectedSession}
                    >
                      Save NPC State
                    </button>
                  </>
                )}
              </>
            )}

            {/* PLAYERS LIST -------------------------------- */}
            {activeRightTab === "players" && (
              <>
                {players.length > 0 ? (
                  players.map((p) => (
                    <div key={p.phone_number} className="mm-player-row">
                      <div>
                        <div className="mm-player-name">{p.player_name}</div>
                        <div className="mm-player-phone">
                          {p.phone_number}
                        </div>
                      </div>

                      <button
                        className="mm-btn-small"
                        onClick={() => handleRemovePlayer(p)}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="mm-placeholder">
                    No players yet — add one below.
                  </div>
                )}
              </>
            )}
          </div>

          {/* NPC/PLAYER CREATION FOOTERS ------------------- */}
          <div className="mm-panel-footer">

            {/* NPC creation */}
            {activeRightTab === "npcs" && (
              <>
                <div className="mm-footer-title">Create NPC</div>

                <input
                  className="mm-input"
                  placeholder="NPC Display Name"
                  value={newNpcDisplayName}
                  onChange={(e) => setNewNpcDisplayName(e.target.value)}
                />

                <input
                  className="mm-input"
                  placeholder="NPC True Name"
                  value={newNpcTrueName}
                  onChange={(e) => setNewNpcTrueName(e.target.value)}
                />

                <textarea
                  className="mm-input mm-textarea"
                  rows={2}
                  placeholder="Public Description"
                  value={newNpcPublicDesc}
                  onChange={(e) => setNewNpcPublicDesc(e.target.value)}
                />

                <button className="mm-btn" onClick={handleCreateNPC}>
                  Add NPC
                </button>

                <div className="mm-footer-title">Import NPC (JSON)</div>

                <textarea
                  className="mm-input mm-textarea"
                  rows={3}
                  placeholder="Paste NPC JSON"
                  value={npcImportText}
                  onChange={(e) => setNpcImportText(e.target.value)}
                />

                <button className="mm-btn" onClick={handleImportNPC}>
                  Import NPC
                </button>
              </>
            )}

            {/* Player creation */}
            {activeRightTab === "players" && (
              <>
                <div className="mm-footer-title">Add Player</div>

                <input
                  className="mm-input"
                  placeholder="Player Name"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  disabled={!selectedSession}
                />

                <input
                  className="mm-input"
                  placeholder="Player Phone Number"
                  value={newPlayerNumber}
                  onChange={(e) => setNewPlayerNumber(e.target.value)}
                  disabled={!selectedSession}
                />

                <button
                  className="mm-btn"
                  onClick={handleAddPlayer}
                  disabled={!selectedSession}
                >
                  Add Player
                </button>
              </>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
