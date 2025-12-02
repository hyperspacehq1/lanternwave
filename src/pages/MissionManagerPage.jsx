import React, { useEffect, useState } from "react";

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
  const [csvErrors, setCsvErrors] = useState([]);

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
     CSV TEMPLATE GENERATOR (1 NPC CSV)
  ====================================================== */
  function downloadNPCcsvTemplate() {
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

    const defaultRow = [
      "NPC Name",
      "True Name",
      "HUMAN",
      "Subtype",
      "Intent description",
      '{"traits":[]}',
      "Goals here...",
      "Secrets here...",
      "Tone here...",
      '{"policy":"minimal"}',
      "Public description...",
      "Secret description...",
    ];

    const csvContent = headers.join(",") + "\n" + defaultRow.join(",");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "npc_template.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  /* ======================================================
     CSV PARSING + AUTO VALIDATION (1 NPC PER CSV)
  ====================================================== */
  async function handleCSVUploadWithValidation(e) {
    const file = e.target.files[0];
    if (!file) return;

    setCsvErrors([]);

    try {
      const text = await file.text();
      const parsed = parseSingleNPCcsvValidated(text);

      if (parsed.errors.length) {
        setCsvErrors(parsed.errors);
        return;
      }

      const data = parsed.data;

      const payload = {
        ...data,
        personality_json: safeJson(data.personality_json),
        truth_policy_json: safeJson(data.truth_policy_json),
      };

      const res = await createNPC(payload);
      setAllNPCs([...allNPCs, res.npc]);

      alert("NPC successfully imported from CSV!");
      setNpcImportModalOpen(false);
    } catch (err) {
      console.error("CSV Import Failed:", err);
      alert("Error reading CSV. Check console.");
    }
  }

  function parseSingleNPCcsvValidated(text) {
    const errors = [];
    const rows = text.trim().split("\n");
    if (rows.length < 2) {
      errors.push("CSV must contain headers + one NPC row.");
      return { errors, data: null };
    }

    const headers = rows[0].split(",").map((h) => h.trim());
    const values = rows[1].split(",").map((v) => v.trim());

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

    requiredFields.forEach((field) => {
      if (!headers.includes(field)) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    if (values.length !== headers.length) {
      errors.push("Number of CSV values does not match the number of headers.");
    }

    const npc = {};
    headers.forEach((h, i) => {
      npc[h] = values[i] || "";
    });

    // Validate JSON fields
    ["personality_json", "truth_policy_json"].forEach((field) => {
      try {
        JSON.parse(npc[field]);
      } catch {
        errors.push(`Invalid JSON in field: ${field}`);
      }
    });

    return { errors, data: npc };
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
              setSelectedSession(found);
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
            Import NPC from CSV
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
         MODAL — IMPORT NPC FROM CSV
      ====================================================== */}
      {npcImportModalOpen && (
        <div className="npc-modal">
          <div className="npc-modal-content">
            <h2>Import NPC from CSV</h2>

            <p style={{ color: "rgb(180,220,180)", fontSize: "11px" }}>
              Upload a CSV file containing exactly <strong>one NPC</strong>.
              The CSV must include all required fields.
            </p>

            <button
              onClick={downloadNPCcsvTemplate}
              style={{ marginBottom: "0.5rem" }}
            >
              Download CSV Template
            </button>

            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUploadWithValidation}
            />

            {csvErrors.length > 0 && (
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
                  {csvErrors.map((err, idx) => (
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
