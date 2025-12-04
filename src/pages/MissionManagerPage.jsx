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
  listMissionMessages,      // ✅ newly added
  sendMissionMessage        // ✅ newly added
} from "../lib/mission-api";

import "./mission-manager.css";

/* ============================================
   WEATHER + EVENT OPTIONS
============================================ */
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
  /* ============================================
     STATE
  ============================================ */
  const [campaigns, setCampaigns] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);   // ⭐ mission-scoped message storage
  const [events, setEvents] = useState([]);
  const [npcList, setNpcList] = useState([]);
  const [missionNPCs, setMissionNPCs] = useState([]);
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [npcState, setNpcState] = useState(null);

  /* ============================================
     FORM FIELDS
  ============================================ */
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

  const [newSessionName, setNewSessionName] = useState("");

  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");

  const [newEventType, setNewEventType] = useState(EVENT_TYPES[0]);
  const [eventLocation, setEventLocation] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventGoal, setEventGoal] = useState("");
  const [eventItem, setEventItem] = useState("");

  const [newNpcDisplayName, setNewNpcDisplayName] = useState("");
  const [newNpcTrueName, setNewNpcTrueName] = useState("");
  const [newNpcPublicDesc, setNewNpcPublicDesc] = useState("");
  const [npcImportText, setNpcImportText] = useState("");
  const [npcStateText, setNpcStateText] = useState("");

  const [activeTimelineTab, setActiveTimelineTab] = useState("events");
  const [activeRightTab, setActiveRightTab] = useState("npcs");

  /* ============================================
     INITIAL LOAD + RESTORE
  ============================================ */
  useEffect(() => {
    restoreSelections();
  }, []);

  async function restoreSelections() {
    const storedCampaignId = localStorage.getItem("selectedCampaignId");
    const storedSessionId = localStorage.getItem("selectedSessionId");

    const allCampaigns = await listCampaigns();
    const campaignList =
      Array.isArray(allCampaigns) ? allCampaigns : allCampaigns.missions || [];

    setCampaigns(campaignList);

    if (storedCampaignId) {
      const found = campaignList.find(
        (c) => String(c.id) === String(storedCampaignId)
      );
      if (found) {
        await handleSelectCampaign(found);

        if (storedSessionId) {
          const ses = sessions.find(
            (s) => String(s.id) === String(storedSessionId)
          );
          if (ses) await handleSelectSession(ses);
        }
      }
    }
  }

  /* ============================================
     LOADERS
  ============================================ */
  async function loadSessionsForCampaign(campaign) {
    if (!campaign) return;
    const data = await listSessions(campaign.id);
    const list = Array.isArray(data) ? data : data.sessions || [];
    setSessions(list);
    return list;
  }

  async function loadPlayersForSession(session) {
    if (!session) return;
    const list = await listSessionPlayers(session.id);
    setPlayers(Array.isArray(list) ? list : list.players || []);
  }

  /* ⭐⭐⭐ PATCHED: Mission-scoped messaging loader ⭐⭐⭐ */
  async function loadMessagesForMission(missionId) {
    if (!missionId) return;
    try {
      const list = await listMissionMessages(missionId);
      setMessages(Array.isArray(list) ? list : list.messages || list.logs || []);
    } catch (err) {
      console.error("Error loading mission messages:", err);
    }
  }

  async function loadEventsForCampaign(campaign) {
    if (!campaign) return;
    const res = await listMissionEvents(campaign.id);
    setEvents(res.events || []);
  }

  async function loadNPCsGlobal() {
    const res = await listNPCs();
    setNpcList(res.npcs || res || []);
  }

  async function loadMissionNPCsForCampaign(campaign) {
    if (!campaign) return;
    const resp = await fetch(
      `/.netlify/functions/api-mission-npcs?mission_id=${campaign.id}`
    );
    const data = await resp.json();
    setMissionNPCs(data.mission_npcs || []);
  }

  /* ============================================
     SELECT HANDLERS
  ============================================ */
  async function handleSelectCampaign(campaign) {
    localStorage.setItem("selectedCampaignId", campaign.id);

    setSelectedCampaign(campaign);
    setSelectedSession(null);
    setPlayers([]);
    setMessages([]);
    setEvents([]);
    setMissionNPCs([]);
    setSelectedNPC(null);
    setNpcState(null);
    setNpcStateText("");

    await Promise.all([
      loadSessionsForCampaign(campaign),
      loadMissionNPCsForCampaign(campaign),
      loadNPCsGlobal(),
      loadEventsForCampaign(campaign),
      loadMessagesForMission(campaign.id)  // ⭐ load mission messages
    ]);
  }

  async function handleSelectSession(session) {
    localStorage.setItem("selectedSessionId", session.id);
    setSelectedSession(session);

    await Promise.all([
      loadPlayersForSession(session),
      loadMessagesForMission(selectedCampaign.id), // ⭐ still mission-scoped
      loadNPCsGlobal()
    ]);
  }

  /* ============================================
     RESET BUTTON
  ============================================ */
  function restartSelections() {
    localStorage.removeItem("selectedCampaignId");
    localStorage.removeItem("selectedSessionId");
    window.location.reload();
  }

  /* ============================================
     CREATE HANDLERS
  ============================================ */
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

    const res = await createCampaign(payload);
    const mission = res.mission || res;

    setCampaigns((prev) => [...prev, mission]);

    setNewCampaignName("");
    setNewMissionIdCode("");
    setNewMissionSummaryKnown("");
    setNewMissionSummaryUnknown("");
    setNewMissionRegion("");
    setNewMissionWeather("");
    setNewMissionDate("");
    setNewMissionAutoCreateSessions(false);
  }

  async function handleCreateSession() {
    if (!selectedCampaign || !newSessionName.trim()) return;

    const res = await createSession(
      selectedCampaign.id,
      newSessionName.trim()
    );
    const session = res.session || res;

    setSessions((prev) => [...prev, session]);
    setNewSessionName("");
  }

  async function handleAddPlayer() {
    if (!selectedSession || !newPlayerNumber.trim()) return;

    await addSessionPlayer({
      session_id: selectedSession.id,
      phone_number: newPlayerNumber.trim(),
      player_name: newPlayerName.trim() || null,
    });

    await loadPlayersForSession(selectedSession);
    setNewPlayerName("");
    setNewPlayerNumber("");
  }

  async function handleRemovePlayer(player) {
    await removeSessionPlayer(player.player_id);
    await loadPlayersForSession(selectedSession);
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
        display_name: parsed.display_name || parsed.name,
        true_name: parsed.true_name || parsed.name,
        description_public:
          parsed.description_public ||
          parsed.bio ||
          parsed.short_bio ||
          null
      });

      setNpcImportText("");
      await loadNPCsGlobal();
    } catch (err) {
      alert("Invalid NPC JSON");
    }
  }

  async function handleAssignNpcToMission(npc) {
    if (!selectedCampaign) return;

    await assignNPCToMission({
      mission_id: selectedCampaign.id,
      npc_id: npc.id,
    });

    await loadMissionNPCsForCampaign(selectedCampaign);
  }

  async function handleArchiveEvent(evt) {
    if (!selectedCampaign) return;
    await archiveMissionEvent(selectedCampaign.id, evt.id);
    await loadEventsForCampaign(selectedCampaign);
  }

  /* ============================================
     NPC STATE
  ============================================ */
  async function loadNpcStateForSelection(session, npc) {
    if (!session || !npc) {
      setNpcState(null);
      setNpcStateText("");
      return;
    }

    const res = await getNPCState(session.id, npc.id);
    const stateObj = res.state || res || {};

    setNpcState(stateObj);
    setNpcStateText(JSON.stringify(stateObj, null, 2));
  }

  function handleSelectNPC(npc) {
    setSelectedNPC(npc);
    loadNpcStateForSelection(selectedSession, npc);
  }

  async function handleSaveNpcState() {
    try {
      const parsed = JSON.parse(npcStateText);
      await updateNPCState({
        session_id: selectedSession.id,
        npc_id: selectedNPC.id,
        state: parsed,
      });
      setNpcState(parsed);
    } catch {
      alert("Invalid JSON");
    }
  }

  /* ============================================
     UI
  ============================================ */

  return (
    <div className="mission-manager">

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

            <button className="mm-btn-small" onClick={restartSelections}>
              Restart
            </button>
          </div>
        </div>
      </header>

      <div className="mm-grid">

        {/* ---------------- CAMPAIGNS PANEL ---------------- */}
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
              <div className="mm-placeholder">No campaigns yet — create one below.</div>
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
                <option key={opt}>{opt}</option>
              ))}
            </select>

            <input
              type="date"
              className="mm-input"
              value={newMissionDate}
              onChange={(e) => setNewMissionDate(e.target.value)}
            />

            <textarea
              className="mm-input mm-textarea"
              placeholder="Summary (What players know)"
              value={newMissionSummaryKnown}
              onChange={(e) => setNewMissionSummaryKnown(e.target.value)}
            />

            <textarea
              className="mm-input mm-textarea"
              placeholder="Secret Summary"
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

        {/* ---------------- SESSIONS PANEL ---------------- */}
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
              <div className="mm-placeholder">No sessions yet — create one below.</div>
            )}
            {!selectedCampaign && (
              <div className="mm-placeholder">Select a campaign first.</div>
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

        {/* ---------------- TIMELINE PANEL ---------------- */}
        <section className="mm-panel">
          <h2 className="mm-panel-title">Timeline</h2>

          <div className="mm-tab-row">
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
              Messages
            </button>
          </div>

          <div className="mm-panel-body mm-scrollable">

            {/* EVENTS */}
            {activeTimelineTab === "events" &&
              (selectedCampaign ? (
                events.length > 0 ? (
                  events.map((evt) => (
                    <div key={evt.id} className="mm-event-row">
                      <div className="mm-event-type">{evt.event_type}</div>

                      <div className="mm-event-info">
                        {evt.payload?.location && (
                          <div><strong>Location:</strong> {evt.payload.location}</div>
                        )}
                        {evt.payload?.description && (
                          <div><strong>Description:</strong> {evt.payload.description}</div>
                        )}
                        {evt.payload?.goal && (
                          <div><strong>Goal:</strong> {evt.payload.goal}</div>
                        )}
                        {evt.payload?.item && (
                          <div><strong>Item:</strong> {evt.payload.item}</div>
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
                <div className="mm-placeholder">Select a campaign first.</div>
              ))}

            {/* ⭐⭐⭐ PATCHED MESSAGES ⭐⭐⭐ */}
            {activeTimelineTab === "messages" &&
              (selectedCampaign ? (
                messages.length > 0 ? (
                  messages.map((msg) => (
                    <div key={msg.id} className="mm-message-row">
                      <div className="mm-message-body">
                        {msg.body}
                      </div>

                      <div className="mm-message-meta">
                        <span className="mm-message-phone">{msg.phone_number}</span>
                        <span className="mm-message-time">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="mm-placeholder">No messages yet.</div>
                )
              ) : (
                <div className="mm-placeholder">
                  Select a campaign to view messages.
                </div>
              ))}

          </div>

          {/* EVENT CREATION */}
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
                  <option key={t}>{t}</option>
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
                placeholder="Goal"
                rows={2}
                value={eventGoal}
                onChange={(e) => setEventGoal(e.target.value)}
                disabled={!selectedCampaign}
              />

              <input
                className="mm-input"
                placeholder="Item"
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

        {/* ---------------- NPC & PLAYERS PANEL ---------------- */}
        <section className="mm-panel">
          <h2 className="mm-panel-title">NPCs & Players</h2>

          <div className="mm-tab-row">
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

          <div className="mm-panel-body mm-scrollable">

            {/* NPC PANEL */}
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
                  <div className="mm-placeholder">No mission NPCs yet.</div>
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
                  <div className="mm-placeholder">No NPCs yet.</div>
                )}

                {selectedNPC && (
                  <>
                    <div className="mm-subtitle">NPC State</div>

                    <textarea
                      className="mm-input mm-textarea"
                      value={npcStateText}
                      rows={6}
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

            {/* PLAYER PANEL */}
            {activeRightTab === "players" && (
              <>
                {players.length > 0 ? (
                  players.map((p) => (
                    <div key={p.phone_number} className="mm-player-row">
                      <div>
                        <div className="mm-player-name">
                          {p.player_name || "Unnamed Player"}
                        </div>
                        <div className="mm-player-phone">{p.phone_number}</div>
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
                  <div className="mm-placeholder">No players yet.</div>
                )}
              </>
            )}
          </div>

          <div className="mm-panel-footer">

          {/* NPC FORM */}
{activeRightTab === "npcs" && (
  <>
    <div className="mm-footer-title">Create NPC</div>

    {/* DISPLAY NAME */}
    <input
      className="mm-input"
      placeholder="NPC Display Name (required)"
      value={newNpcDisplayName}
      onChange={(e) => setNewNpcDisplayName(e.target.value)}
    />

    {/* TRUE NAME */}
    <input
      className="mm-input"
      placeholder="NPC True Name (required)"
      value={newNpcTrueName}
      onChange={(e) => setNewNpcTrueName(e.target.value)}
    />

    {/* PRIMARY CATEGORY */}
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

    {/* SECONDARY SUBTYPE */}
    <input
      className="mm-input"
      placeholder="Secondary Subtype"
      value={newNpcSecondarySubtype}
      onChange={(e) => setNewNpcSecondarySubtype(e.target.value)}
    />

    {/* INTENT */}
    <input
      className="mm-input"
      placeholder="Intent / Motivation"
      value={newNpcIntent}
      onChange={(e) => setNewNpcIntent(e.target.value)}
    />

    {/* PUBLIC DESCRIPTION */}
    <textarea
      className="mm-input mm-textarea"
      placeholder="Public Description"
      rows={2}
      value={newNpcPublicDesc}
      onChange={(e) => setNewNpcPublicDesc(e.target.value)}
    />

    {/* SECRET DESCRIPTION */}
    <textarea
      className="mm-input mm-textarea"
      placeholder="Secret Description"
      rows={2}
      value={newNpcSecretDesc}
      onChange={(e) => setNewNpcSecretDesc(e.target.value)}
    />

    {/* GOALS */}
    <textarea
      className="mm-input mm-textarea"
      placeholder="Goals / Objectives"
      rows={2}
      value={newNpcGoalsText}
      onChange={(e) => setNewNpcGoalsText(e.target.value)}
    />

    {/* SECRETS */}
    <textarea
      className="mm-input mm-textarea"
      placeholder="Secrets"
      rows={2}
      value={newNpcSecretsText}
      onChange={(e) => setNewNpcSecretsText(e.target.value)}
    />

    {/* NOTES */}
    <textarea
      className="mm-input mm-textarea"
      placeholder="Notes"
      rows={2}
      value={newNpcNotes}
      onChange={(e) => setNewNpcNotes(e.target.value)}
    />

    {/* CREATE BUTTON */}
    <button
      className="mm-btn"
      onClick={() =>
        handleCreateNPC({
          display_name: newNpcDisplayName,
          true_name: newNpcTrueName,
          primary_category: newNpcPrimaryCategory,
          secondary_subtype: newNpcSecondarySubtype,
          intent: newNpcIntent,
          description_public: newNpcPublicDesc,
          description_secret: newNpcSecretDesc,
          goals_text: newNpcGoalsText,
          secrets_text: newNpcSecretsText,
          notes: newNpcNotes,
        })
      }
    >
      Add NPC
    </button>

    {/* IMPORT JSON */}
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
  </>
)}

            {/* PLAYER FORM */}
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
