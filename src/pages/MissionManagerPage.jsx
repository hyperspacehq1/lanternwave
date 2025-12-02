import React, { useEffect, useState } from "react";

import {
  listMissions,
  listMissionSessions,
  createMission,
  createMissionSession,
  listSessionPlayers,
  addPlayerToSession,
  listMissionEvents,
  listMissionMessages,
  getAllNPCs,
  listMissionNPCs,
  addNPCtoMission,
  createNPC
} from "../lib/mission-api";

import "./mission-manager.css";

export default function MissionManagerPage() {
  const [missions, setMissions] = useState([]);
  const [selectedMissionId, setSelectedMissionId] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  const [players, setPlayers] = useState([]);
  const [events, setEvents] = useState([]);
  const [messages, setMessages] = useState([]);

  const [allNPCs, setAllNPCs] = useState([]);
  const [missionNPCs, setMissionNPCs] = useState([]);

  // Modals
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [npcModalOpen, setNpcModalOpen] = useState(false);

  // NEW JSON NPC Import modal
  const [npcJsonModalOpen, setNpcJsonModalOpen] = useState(false);
  const [jsonErrors, setJsonErrors] = useState([]);

  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [sessionName, setSessionName] = useState("");

  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPhone, setNewPlayerPhone] = useState("");

  const [npcForm, setNpcForm] = useState({
    display_name: "",
    true_name: "",
    primary_category: "",
    secondary_subtype: "",
    intent: "",
    personality_json: "{}",
    goals_text: "",
    secrets_text: "",
    tone_text: "",
    truth_policy_json: "{}",
    description_public: "",
    description_secret: ""
  });

  /* ============================================
     LOAD INITIAL DATA
  ============================================= */
  useEffect(() => {
    async function load() {
      try {
        const m = await listMissions();
        setMissions(m || []);
      } catch (e) {
        console.error("Error loading missions:", e);
      }

      try {
        const npcRes = await getAllNPCs();
        setAllNPCs(npcRes.npcs || []);
      } catch (e) {
        console.error("Error loading NPC list:", e);
      }
    }
    load();
  }, []);

  /* ============================================
     LOAD SESSIONS WHEN CAMPAIGN CHANGES
  ============================================= */
  useEffect(() => {
    if (!selectedMissionId) return;

    async function loadSessions() {
      try {
        const s = await listMissionSessions(selectedMissionId);
        setSessions(s || []);
        if (s?.length) setSelectedSession(s[0]);
      } catch (e) {
        console.error("Error loading sessions:", e);
      }
    }
    loadSessions();
  }, [selectedMissionId]);

  /* ============================================
     LOAD SESSION DETAILS
  ============================================= */
  useEffect(() => {
    if (!selectedSession) return;

    async function loadSessionData() {
      try {
        const p = await listSessionPlayers(selectedSession.id);
        setPlayers(p || []);
      } catch (e) {
        console.error("Error loading players:", e);
      }

      try {
        const ex = await listMissionEvents(selectedSession.id);
        setEvents(ex || []);
      } catch (e) {
        console.error("Error loading events:", e);
      }

      try {
        const msg = await listMissionMessages(selectedMissionId);
        setMessages(msg || []);
      } catch (e) {
        console.error("Error loading messages:", e);
      }

      try {
        const mNPC = await listMissionNPCs(selectedMissionId);
        setMissionNPCs(mNPC.mission_npcs || []);
      } catch (e) {
        console.error("Error loading mission NPCs:", e);
      }
    }

    loadSessionData();
  }, [selectedSession, selectedMissionId]);

  /* ============================================
     CREATE CAMPAIGN
  ============================================= */
  async function submitCampaign() {
    if (!campaignName.trim()) return;

    try {
      const r = await createMission({ name: campaignName.trim() });
      setMissions([...missions, r.mission]);
      setCampaignModalOpen(false);
    } catch (e) {
      console.error("Failed to create campaign:", e);
    }
  }

  /* ============================================
     CREATE SESSION
  ============================================= */
  async function submitSession() {
    if (!sessionName.trim()) return;
    if (!selectedMissionId) return;

    try {
      const r = await createMissionSession({
        mission_id: selectedMissionId,
        session_name: sessionName.trim()
      });

      setSessions([...sessions, r.session]);
      setSessionModalOpen(false);
    } catch (e) {
      console.error("Failed to create session:", e);
    }
  }

  /* ============================================
     CREATE NPC (Manual)
  ============================================= */
  async function submitNewNPC() {
    try {
      const payload = {
        ...npcForm,
        personality_json: JSON.parse(npcForm.personality_json || "{}"),
        truth_policy_json: JSON.parse(npcForm.truth_policy_json || "{}")
      };

      const res = await createNPC(payload);
      setAllNPCs([...allNPCs, res.npc]);

      alert("NPC created!");
      setNpcModalOpen(false);
    } catch (e) {
      console.error("Error creating NPC:", e);
      alert("Error creating NPC. Check console.");
    }
  }

  /* ============================================
     ASSIGN EXISTING NPC
  ============================================= */
  async function handleAssignNPC(npcId) {
    if (!npcId) return;
    if (!selectedMissionId) return alert("Select a campaign first.");

    try {
      const res = await addNPCtoMission({
        mission_id: selectedMissionId,
        npc_id: npcId,
        is_known: true
      });

      setMissionNPCs([...missionNPCs, res.mission_npc]);
    } catch (e) {
      console.error("Error assigning NPC:", e);
    }
  }

  /* ============================================
     ADD PLAYER
  ============================================= */
  async function handleAddPlayer() {
    if (!selectedSession) return alert("Select a session first.");
    if (!newPlayerName.trim() && !newPlayerPhone.trim())
      return alert("Enter a player name or phone.");

    try {
      await addPlayerToSession({
        session_id: selectedSession.id,
        player_name: newPlayerName.trim() || null,
        phone_number: newPlayerPhone.trim() || null
      });

      const updated = await listSessionPlayers(selectedSession.id);
      setPlayers(updated || []);

      setNewPlayerName("");
      setNewPlayerPhone("");
    } catch (e) {
      console.error("Error adding player:", e);
    }
  }

  /* ============================================
     JSON IMPORT (with BOM fix)
  ============================================= */
  async function handleNPCjsonUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setJsonErrors([]);

    try {
      let text = await file.text();

      // FIX: Strip UTF-8 BOM if present
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }

      const json = JSON.parse(text);
      const npc = Array.isArray(json) ? json[0] : json;

      const errs = validateNPCjson(npc);
      if (errs.length) {
        setJsonErrors(errs);
        return;
      }

      const payload = {
        ...npc,
        personality_json: npc.personality_json || {},
        truth_policy_json: npc.truth_policy_json || {}
      };

      const res = await createNPC(payload);
      setAllNPCs([...allNPCs, res.npc]);

      alert("NPC imported!");
      setNpcJsonModalOpen(false);
    } catch (err) {
      console.error("JSON Import Error:", err);
      alert("Invalid JSON file");
    }
  }

  function validateNPCjson(npc) {
    const required = [
      "display_name",
      "true_name",
      "primary_category",
      "secondary_subtype",
      "intent",
      "personality_json",
      "goals_text",
      "secrets_text",
      "tone_text",
      "truth_policy_json",
      "description_public",
      "description_secret"
    ];

    const errs = [];

    required.forEach(f => {
      if (!npc[f]) errs.push(`Missing field: ${f}`);
    });

    if (typeof npc.personality_json !== "object")
      errs.push("personality_json must be an object");

    if (typeof npc.truth_policy_json !== "object")
      errs.push("truth_policy_json must be an object");

    return errs;
  }

  /* ============================================
     RENDER
  ============================================= */
  return (
    <div className="mission-manager">
      <h1>Campaign Manager</h1>

      <div className="columns">
        {/* LEFT COLUMN */}
        <div className="left-col">
          <label>Campaign</label>
          <select
            value={selectedMissionId || ""}
            onChange={(e) => setSelectedMissionId(Number(e.target.value))}
          >
            <option value="">Select Campaign</option>
            {missions.map((m) => (
              <option value={m.id} key={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <button onClick={() => setCampaignModalOpen(true)}>
            Create Campaign
          </button>

          <label>Sessions</label>
          <select
            value={selectedSession?.id || ""}
            onChange={(e) => {
              const id = Number(e.target.value);
              const s = sessions.find(ss => ss.id === id);
              setSelectedSession(s || null);
            }}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.session_name}
              </option>
            ))}
          </select>

          <button onClick={() => setSessionModalOpen(true)}>
            New Session
          </button>

          <label>NPCs in Campaign</label>
          <ul className="npc-list">
            {missionNPCs.map((npc) => (
              <li key={npc.id}>{npc.display_name}</li>
            ))}
          </ul>

          <button onClick={() => setNpcModalOpen(true)}>Add New NPC</button>

          {/* NEW JSON IMPORT BUTTON */}
          <button onClick={() => setNpcJsonModalOpen(true)}>
            Import NPC JSON
          </button>

          <label>Assign Existing NPC</label>
          <select onChange={(e) => handleAssignNPC(Number(e.target.value))}>
            <option value="">Choose NPC</option>
            {allNPCs.map((npc) => (
              <option key={npc.id} value={npc.id}>
                {npc.display_name}
              </option>
            ))}
          </select>
        </div>

        {/* RIGHT COLUMN */}
        <div className="right-col">
          <h2>Session Data</h2>

          <h3>Players</h3>
          <ul className="player-list">
            {players.map((p) => (
              <li key={p.id}>{p.player_name || p.phone_number}</li>
            ))}
          </ul>

          <label>Player Name</label>
          <input
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
          />

          <label>Player Phone</label>
          <input
            value={newPlayerPhone}
            onChange={(e) => setNewPlayerPhone(e.target.value)}
          />

          <button onClick={handleAddPlayer}>Add Player</button>

          <h3>Events</h3>
          <ul>
            {events.map((ev) => (
              <li key={ev.id}>{ev.event_type}</li>
            ))}
          </ul>

          <h3>Messages</h3>
          <ul className="msg-list">
            {messages.map((m) => (
              <li key={m.id}>{m.body}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* ===========================
          MODAL: Create Campaign
      ============================ */}
      {campaignModalOpen && (
        <div className="npc-modal">
          <div className="npc-modal-content">
            <h2>Create Campaign</h2>

            <input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />

            <button onClick={submitCampaign}>Save</button>
            <button onClick={() => setCampaignModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ===========================
          MODAL: Create Session
      ============================ */}
      {sessionModalOpen && (
        <div className="npc-modal">
          <div className="npc-modal-content">
            <h2>Create Session</h2>

            <input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />

            <button onClick={submitSession}>Save</button>
            <button onClick={() => setSessionModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ===========================
          MODAL: Manual NPC
      ============================ */}
      {npcModalOpen && (
        <div className="npc-modal">
          <div className="npc-modal-content">
            <h2>Create NPC</h2>

            {Object.keys(npcForm).map((key) => (
              <div className="field" key={key}>
                <label>{key}</label>
                <textarea
                  value={npcForm[key]}
                  onChange={(e) =>
                    setNpcForm({ ...npcForm, [key]: e.target.value })
                  }
                />
              </div>
            ))}

            <button onClick={submitNewNPC}>Save NPC</button>
            <button onClick={() => setNpcModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ===========================
          MODAL: JSON NPC Import
      ============================ */}
      {npcJsonModalOpen && (
        <div className="npc-modal">
          <div className="npc-modal-content">
            <h2>Import NPC JSON</h2>

            <input
              type="file"
              accept=".json"
              onChange={handleNPCjsonUpload}
            />

            {jsonErrors.length > 0 && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem",
                  background: "rgba(80,0,0,0.35)",
                  border: "1px solid red",
                  borderRadius: "6px",
                  color: "#ffbfbf",
                  fontSize: "11px"
                }}
              >
                <strong>Errors:</strong>
                <ul>
                  {jsonErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <button onClick={() => setNpcJsonModalOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
