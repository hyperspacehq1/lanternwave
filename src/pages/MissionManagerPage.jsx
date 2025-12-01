import React, { useEffect, useState } from "react";

import {
  listMissions,
  listSessionsByCampaign,
  createMission,
  createSession,
  listSessionPlayers,
  addPlayerToSession,
  listSessionEvents,
  createSessionEvent,
  listSessionMessages,
  getAllNPCs,
  listMissionNPCs,
  addNPCtoMission,
  getNPCState,
  createNPC,
} from "../lib/mission-api";

// ✅ FIXED CSS IMPORT — CORRECT PATH
import "./mission-manager.css";

export default function MissionManagerPage() {
  /* -------------------------------------------------------------
     STATE
  ------------------------------------------------------------- */

  const [missions, setMissions] = useState([]);
  const [selectedMissionId, setSelectedMissionId] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  const [players, setPlayers] = useState([]);
  const [events, setEvents] = useState([]);
  const [messages, setMessages] = useState([]);

  const [allNPCs, setAllNPCs] = useState([]);
  const [missionNPCs, setMissionNPCs] = useState([]);

  const [npcModalOpen, setNpcModalOpen] = useState(false);
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
    description_secret: "",
  });

  /* -------------------------------------------------------------
     INITIAL LOAD
  ------------------------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        const m = await listMissions();
        setMissions(m || []);
      } catch (err) {
        console.error("Error loading missions:", err);
      }

      try {
        const npcRes = await getAllNPCs();
        setAllNPCs(npcRes.npcs || []);
      } catch (err) {
        console.error("Error loading global NPC list:", err);
      }
    }

    load();
  }, []);

  /* -------------------------------------------------------------
     LOAD SESSIONS WHEN CAMPAIGN CHANGES
  ------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedMissionId) return;

    async function loadSessions() {
      try {
        const s = await listSessionsByCampaign(selectedMissionId);
        setSessions(s || []);

        if (s?.length > 0) {
          setSelectedSession(s[0]);
        }
      } catch (err) {
        console.error("Error loading sessions:", err);
      }
    }

    loadSessions();
  }, [selectedMissionId]);

  /* -------------------------------------------------------------
     LOAD SESSION DETAILS WHEN SESSION CHANGES
  ------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedSession) return;

    async function loadDetails() {
      try {
        const p = await listSessionPlayers(selectedSession.id);
        setPlayers(p || []);
      } catch (err) {
        console.error("Error loading players:", err);
      }

      try {
        const e = await listSessionEvents(selectedSession.id);
        setEvents(e || []);
      } catch (err) {
        console.error("Error loading events:", err);
      }

      try {
        const msg = await listSessionMessages(selectedMissionId);
        setMessages(msg || []);
      } catch (err) {
        console.error("Error loading messages:", err);
      }

      try {
        const mNPC = await listMissionNPCs(selectedMissionId);
        setMissionNPCs(mNPC.mission_npcs || []);
      } catch (err) {
        console.error("Error loading mission NPCs:", err);
      }
    }

    loadDetails();
  }, [selectedSession, selectedMissionId]);

  /* -------------------------------------------------------------
     HANDLERS
  ------------------------------------------------------------- */

  async function handleCreateMission() {
    const name = prompt("Enter campaign name:");
    if (!name) return;

    try {
      const result = await createMission({ name });
      setMissions([...missions, result.mission]);
    } catch (err) {
      console.error("Create mission failed:", err);
    }
  }

  async function handleCreateSession() {
    if (!selectedMissionId) {
      alert("Please select a campaign first.");
      return;
    }

    const name = prompt("Enter session name:");
    if (!name) return;

    try {
      const s = await createSession({
        mission_id: selectedMissionId,
        session_name: name,
      });

      setSessions([...sessions, s.session]);
    } catch (err) {
      console.error("Failed creating session:", err);
    }
  }

  async function handleAddNPC() {
    setNpcModalOpen(true);
  }

  async function submitNewNPC() {
    try {
      const payload = {
        ...npcForm,
        personality_json: JSON.parse(npcForm.personality_json || "{}"),
        truth_policy_json: JSON.parse(npcForm.truth_policy_json || "{}"),
      };

      const res = await createNPC(payload);

      setNpcModalOpen(false);
      setAllNPCs([...allNPCs, res.npc]);
      alert("NPC created!");
    } catch (err) {
      console.error("Failed to create NPC:", err);
      alert("Error creating NPC. Check console.");
    }
  }

  async function handleAssignNPC(npcId) {
    try {
      const res = await addNPCtoMission({
        mission_id: selectedMissionId,
        npc_id: npcId,
        is_known: true,
      });

      setMissionNPCs([...missionNPCs, res.mission_npc]);
    } catch (err) {
      console.error("Failed assigning NPC:", err);
      alert("Error assigning NPC");
    }
  }

  /* -------------------------------------------------------------
     RENDER
  ------------------------------------------------------------- */
  return (
    <div className="mission-manager">
      <h1>Campaign Manager</h1>

      <div className="columns">
        <div className="left-col">
          <label>Campaign</label>
          <select
            value={selectedMissionId || ""}
            onChange={(e) => setSelectedMissionId(Number(e.target.value))}
          >
            <option value="">Select Campaign</option>
            {missions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <button onClick={handleCreateMission}>Create Campaign</button>

          <label>Sessions</label>
          <select
            value={selectedSession?.id || ""}
            onChange={(e) => {
              const found = sessions.find((s) => s.id === Number(e.target.value));
              setSelectedSession(found);
            }}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.session_name}
              </option>
            ))}
          </select>

          <button onClick={handleCreateSession}>New Session</button>

          <label>NPCs Assigned To Campaign</label>
          <ul className="npc-list">
            {missionNPCs.map((npc) => (
              <li key={npc.id}>{npc.display_name || `NPC #${npc.npc_id}`}</li>
            ))}
          </ul>

          <button onClick={handleAddNPC}>Add New NPC</button>

          <label>Assign Existing NPC</label>
          <select onChange={(e) => handleAssignNPC(Number(e.target.value))}>
            <option value="">Choose NPC</option>
            {allNPCs.map((npc) => (
              <option value={npc.id} key={npc.id}>
                {npc.display_name}
              </option>
            ))}
          </select>
        </div>

        <div className="right-col">
          <h2>Session Data</h2>

          <h3>Players</h3>
          <ul className="player-list">
            {players.map((p) => (
              <li key={p.id}>{p.player_name || p.phone_number}</li>
            ))}
          </ul>

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
    </div>
  );
}
