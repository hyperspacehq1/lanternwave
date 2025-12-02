import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";

import {
  listMissions,
  listMissionSessions,
  createMission,
  createMissionSession,
  listSessionPlayers,
  addPlayerToSession,
  listMissionEvents,
  createMissionEvent,
  listMissionMessages,
  getAllNPCs,
  listMissionNPCs,
  addNPCtoMission,
  getNPCState,
  createNPC,
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

  /* ======================================================
     MODALS STATE (Campaign, Session, NPC, NPC Import)
  ====================================================== */
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [npcModalOpen, setNpcModalOpen] = useState(false);
  const [npcImportModalOpen, setNpcImportModalOpen] = useState(false);

  const [importErrors, setImportErrors] = useState([]);

  const [campaignName, setCampaignName] = useState("");
  const [sessionName, setSessionName] = useState("");

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

  /* ======================================================
     PLAYER INPUT STATE (restored behavior)
  ====================================================== */
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPhone, setNewPlayerPhone] = useState("");

  /* ======================================================
     INITIAL DATA LOAD
  ====================================================== */
  useEffect(() => {
    async function init() {
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
        console.error("Error loading NPC list:", err);
      }
    }

    init();
  }, []);

  /* ======================================================
     LOAD SESSIONS WHEN MISSION CHANGES
  ====================================================== */
  useEffect(() => {
    if (!selectedMissionId) return;

    async function loadSessions() {
      try {
        const s = await listMissionSessions(selectedMissionId);
        setSessions(s || []);

        if (s?.length) setSelectedSession(s[0]);
      } catch (err) {
        console.error("Error loading sessions:", err);
      }
    }

    loadSessions();
  }, [selectedMissionId]);

  /* ======================================================
     LOAD SESSION DETAILS (players/events/messages/npcs)
  ====================================================== */
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
        const e = await listMissionEvents(selectedSession.id);
        setEvents(e || []);
      } catch (err) {
        console.error("Error loading events:", err);
      }

      try {
        const msg = await listMissionMessages(selectedMissionId);
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

  /* ======================================================
     HANDLERS — OPEN MODALS
  ====================================================== */
  function openCampaignModal() {
    setCampaignName("");
    setCampaignModalOpen(true);
  }

  function openSessionModal() {
    if (!selectedMissionId) return alert("Select campaign first.");
    setSessionName("");
    setSessionModalOpen(true);
  }

  function openNPCModal() {
    setNpcModalOpen(true);
  }

  /* ======================================================
     HANDLERS — SUBMIT MODALS
  ====================================================== */
  async function submitCampaign() {
    if (!campaignName.trim()) return;

    try {
      const result = await createMission({ name: campaignName.trim() });
      setMissions([...missions, result.mission]);
      setCampaignModalOpen(false);
    } catch (err) {
      console.error("Failed creating campaign:", err);
    }
  }

  async function submitSession() {
    if (!sessionName.trim()) return;
    if (!selectedMissionId) return;

    try {
      const s = await createMissionSession({
        mission_id: selectedMissionId,
        session_name: sessionName.trim(),
      });

      setSessions([...sessions, s.session]);
      setSessionModalOpen(false);
    } catch (err) {
      console.error("Failed creating session:", err);
    }
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

  /* ======================================================
     ASSIGN EXISTING NPC TO CAMPAIGN
  ====================================================== */
  async function handleAssignNPC(npcId) {
    if (!npcId) return;
    if (!selectedMissionId) {
      alert("Select a campaign first.");
      return;
    }

    try {
      const res = await addNPCtoMission({
        mission_id: selectedMissionId,
        npc_id: npcId,
        is_known: true,
      });

      setMissionNPCs([...missionNPCs, res.mission_npc]);
    } catch (err) {
      console.error("Error assigning NPC:", err);
      alert("Failed to assign NPC");
    }
  }

  /* ======================================================
     PLAYER HANDLERS (restored Add Player behavior)
  ====================================================== */
  async function handleAddPlayer() {
    if (!selectedSession) {
      alert("Select a session first.");
      return;
    }

    if (!newPlayerName.trim() && !newPlayerPhone.trim()) {
      alert("Enter a player name or phone.");
      return;
    }

    try {
      await addPlayerToSession({
        session_id: selectedSession.id,
        player_name: newPlayerName.trim() || null,
        phone_number: newPlayerPhone.trim() || null,
      });

      // Reload players to stay in sync with backend
      const updated = await listSessionPlayers(selectedSession.id);
      setPlayers(updated || []);
      setNewPlayerName("");
      setNewPlayerPhone("");
    } catch (err) {
      console.error("Failed to add player:", err);
      alert("Error adding player. Check console.");
    }
  }

  /* ======================================================
     XLSX TEMPLATE GENERATOR (1 NPC PER SHEET)
  ====================================================== */
  function downloadNPCxlsxTemplate() {
    const headers = [
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
      "description_secret",
    ];

    const sample = [
      {
        display_name: "NPC Name",
        true_name: "True Name",
        primary_category: "HUMAN",
        secondary_subtype: "Subtype",
        intent: "Intent description",
        personality_json: '{"traits":[]}',
        goals_text: "Goals...",
        secrets_text: "Secret info...",
        tone_text: "Tone details...",
        truth_policy_json: '{"policy":"minimal"}',
        description_public: "Public description...",
        description_secret: "Secret description...",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sample, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "NPC");

    XLSX.writeFile(workbook, "npc_template.xlsx");
  }

  /* ======================================================
     XLSX IMPORT FOR NPC (1 ROW = 1 NPC)
  ====================================================== */
  async function handleXLSXUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setImportErrors([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

      if (!json.length) {
        setImportErrors(["XLSX file contains no NPC rows."]);
        return;
      }

      const npc = json[0]; // first row only

      const validationErrors = validateNPC(npc);
      if (validationErrors.length) {
        setImportErrors(validationErrors);
        return;
      }

      const payload = {
        ...npc,
        personality_json: safeJson(npc.personality_json),
        truth_policy_json: safeJson(npc.truth_policy_json),
      };

      const res = await createNPC(payload);
      setAllNPCs([...allNPCs, res.npc]);

      alert("NPC successfully imported from XLSX!");
      setNpcImportModalOpen(false);
    } catch (err) {
      console.error("XLSX Import Error:", err);
      alert("Failed to read XLSX. Check console.");
    }
  }

  function validateNPC(npc) {
    const requiredFields = [
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
      "description_secret",
    ];

    const errors = [];

    requiredFields.forEach((field) => {
      if (!npc[field]) {
        errors.push(`Missing field: ${field}`);
      }
    });

    // Validate JSON fields
    ["personality_json", "truth_policy_json"].forEach((field) => {
      try {
        JSON.parse(npc[field]);
      } catch {
        errors.push(`Invalid JSON in ${field}`);
      }
    });

    return errors;
  }

  function safeJson(str) {
    try {
      return JSON.parse(str);
    } catch {
      return {};
    }
  }

  /* ======================================================
     UI RENDER
  ====================================================== */
  return (
    <div className="mission-manager">
      <h1>Campaign Manager</h1>

      <div className="columns">
        {/* LEFT PANEL */}
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

          <button onClick={openCampaignModal}>Create Campaign</button>

          <label>Sessions</label>
          <select
            value={selectedSession?.id || ""}
            onChange={(e) => {
              const found = sessions.find(
                (s) => s.id === Number(e.target.value)
              );
              setSelectedSession(found || null);
            }}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.session_name}
              </option>
            ))}
          </select>

          <button onClick={openSessionModal}>New Session</button>

          <label>NPCs Assigned To Campaign</label>
          <ul className="npc-list">
            {missionNPCs.map((npc) => (
              <li key={npc.id}>
                {npc.display_name || `NPC #${npc.npc_id}`}
              </li>
            ))}
          </ul>

          <button onClick={openNPCModal}>Add New NPC</button>

          <button onClick={() => setNpcImportModalOpen(true)}>
            Import NPC from XLSX
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

        {/* RIGHT PANEL */}
        <div className="right-col">
          <h2>Session Data</h2>

          <h3>Players</h3>
          <ul className="player-list">
            {players.map((p) => (
              <li key={p.id}>{p.player_name || p.phone_number}</li>
            ))}
          </ul>

          {/* Restored Add Player UI */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label>Player Name</label>
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Optional"
            />
            <label>Phone Number</label>
            <input
              type="text"
              value={newPlayerPhone}
              onChange={(e) => setNewPlayerPhone(e.target.value)}
              placeholder="Optional"
            />
            <button onClick={handleAddPlayer}>Add Player</button>
          </div>

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

      {/* ======================================================
         MODAL — CREATE CAMPAIGN
      ====================================================== */}
      {campaignModalOpen && (
        <div className="npc-modal">
          <div className="npc-modal-content">
            <h2>Create Campaign</h2>

            <label>Campaign Name</label>
            <input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />

            <button onClick={submitCampaign}>Save</button>
            <button onClick={() => setCampaignModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ======================================================
         MODAL — CREATE SESSION
      ====================================================== */}
      {sessionModalOpen && (
        <div className="npc-modal">
          <div className="npc-modal-content">
            <h2>Create Session</h2>

            <label>Session Name</label>
            <input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />

            <button onClick={submitSession}>Save</button>
            <button onClick={() => setSessionModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ======================================================
         MODAL — CREATE NPC
      ====================================================== */}
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

      {/* ======================================================
         MODAL — IMPORT NPC FROM XLSX
      ====================================================== */}
      {npcImportModalOpen && (
        <div className="npc-modal">
          <div className="npc-modal-content">
            <h2>Import NPC from XLSX</h2>

            <p style={{ color: "rgb(180,220,180)", fontSize: "11px" }}>
              Upload an <strong>.xlsx</strong> file containing exactly{" "}
              <strong>one NPC</strong> in the first row.
            </p>

            <button
              onClick={downloadNPCxlsxTemplate}
              style={{ marginBottom: "0.5rem" }}
            >
              Download XLSX Template
            </button>

            <input type="file" accept=".xlsx" onChange={handleXLSXUpload} />

            {importErrors.length > 0 && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem",
                  background: "rgba(80,0,0,0.45)",
                  border: "1px solid red",
                  borderRadius: "6px",
                  color: "#ffbfbf",
                  fontSize: "11px",
                }}
              >
                <strong>Errors detected:</strong>
                <ul>
                  {importErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <button onClick={() => setNpcImportModalOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
