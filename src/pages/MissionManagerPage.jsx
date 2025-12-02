import React, { useEffect, useRef, useState } from "react";

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
  updateNPCState,
  createNPC,
} from "../lib/mission-api";

import "./mission-manager.css";

export default function MissionManagerPage() {
  /* -------------------------------------------------------------
     CORE STATE
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

  const [activeTab, setActiveTab] = useState("session"); // session | players | events | messages | npc

  /* -------------------- Player form --------------------- */
  const [playerName, setPlayerName] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");

  /* -------------------- Event form ---------------------- */
  const [eventType, setEventType] = useState("");
  const [eventPayload, setEventPayload] = useState("");

  /* -------------------- NPC modal + form ---------------- */
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

  /* -------------------- NPC JSON import ----------------- */
  const fileInputRef = useRef(null);
  const [npcImportStatus, setNpcImportStatus] = useState(null);

  /* -------------------- NPC state / memory -------------- */
  const [selectedNpcForState, setSelectedNpcForState] = useState(null); // npc_id
  const [npcStateLoading, setNpcStateLoading] = useState(false);
  const [npcStateError, setNpcStateError] = useState(null);
  const [npcStateRaw, setNpcStateRaw] = useState(""); // editable JSON blob

  /* -------------------- Diagnostics --------------------- */
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [diagnosticsResults, setDiagnosticsResults] = useState([]);

  /* -------------------------------------------------------------
     INITIAL LOAD: MISSIONS + GLOBAL NPC CATALOG
  ------------------------------------------------------------- */
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
        console.error("Error loading NPCs:", err);
      }
    }

    init();
  }, []);

  /* -------------------------------------------------------------
     LOAD SESSIONS WHEN CAMPAIGN CHANGES
  ------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedMissionId) return;

    async function loadSessions() {
      try {
        const s = await listMissionSessions(selectedMissionId);
        setSessions(s || []);

        if (s?.length) {
          setSelectedSession(s[0]);
        } else {
          setSelectedSession(null);
        }

        // campaign-level NPCs
        const mNPC = await listMissionNPCs(selectedMissionId);
        setMissionNPCs(mNPC.mission_npcs || []);
      } catch (err) {
        console.error("Error loading sessions or mission NPCs:", err);
      }
    }

    loadSessions();
  }, [selectedMissionId]);

  /* -------------------------------------------------------------
     LOAD SESSION DETAILS WHEN SESSION CHANGES
  ------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedSession || !selectedMissionId) return;

    async function loadDetails() {
      try {
        const p = await listSessionPlayers(selectedSession.id);
        setPlayers(p || []);
      } catch (err) {
        console.error("Error loading players:", err);
      }

      try {
        const ev = await listMissionEvents(selectedSession.id);
        setEvents(ev || []);
      } catch (err) {
        console.error("Error loading events:", err);
      }

      try {
        const msg = await listMissionMessages(selectedMissionId);
        setMessages(msg || []);
      } catch (err) {
        console.error("Error loading messages:", err);
      }
    }

    loadDetails();
  }, [selectedSession, selectedMissionId]);

  /* -------------------------------------------------------------
     LOAD NPC STATE WHEN NPC + SESSION SELECTED
  ------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedSession || !selectedNpcForState) return;

    async function loadNpcState() {
      setNpcStateLoading(true);
      setNpcStateError(null);
      try {
        const state = await getNPCState(selectedSession.id, selectedNpcForState);
        const pretty = JSON.stringify(state || {}, null, 2);
        setNpcStateRaw(pretty);
      } catch (err) {
        console.error("Error loading NPC state:", err);
        setNpcStateError("Unable to load NPC state.");
        setNpcStateRaw("{}");
      } finally {
        setNpcStateLoading(false);
      }
    }

    loadNpcState();
  }, [selectedSession, selectedNpcForState]);

  /* -------------------------------------------------------------
     HANDLERS: CAMPAIGNS & SESSIONS
  ------------------------------------------------------------- */

  async function handleCreateMission() {
    const name = prompt("Enter campaign name:");
    if (!name) return;

    try {
      const result = await createMission({ name });
      setMissions((prev) => [...prev, result.mission]);
    } catch (err) {
      console.error("Failed creating mission:", err);
      alert("Error creating campaign. See console for details.");
    }
  }

  async function handleCreateSession() {
    if (!selectedMissionId) {
      alert("Select a campaign first.");
      return;
    }

    const name = prompt("Enter session name:");
    if (!name) return;

    try {
      const s = await createMissionSession({
        mission_id: selectedMissionId,
        session_name: name,
      });

      setSessions((prev) => [...prev, s.session]);
      setSelectedSession(s.session);
    } catch (err) {
      console.error("Failed creating session:", err);
      alert("Error creating session. See console.");
    }
  }

  /* -------------------------------------------------------------
     HANDLERS: PLAYERS
  ------------------------------------------------------------- */

  async function handleAddPlayer() {
    if (!selectedSession) {
      alert("Select a session first.");
      return;
    }

    const name = playerName.trim();
    const phone = playerPhone.trim();
    if (!name || !phone) {
      alert("Enter both name and phone.");
      return;
    }

    try {
      await addPlayerToSession({
        session_id: selectedSession.id,
        player_name: name,
        phone_number: phone,
      });

      const p = await listSessionPlayers(selectedSession.id);
      setPlayers(p || []);

      setPlayerName("");
      setPlayerPhone("");
    } catch (err) {
      console.error("Failed adding player:", err);
      alert("Error adding player. See console.");
    }
  }

  /* -------------------------------------------------------------
     HANDLERS: EVENTS
  ------------------------------------------------------------- */

  async function handleAddEvent() {
    if (!selectedSession) {
      alert("Select a session first.");
      return;
    }

    if (!eventType.trim()) {
      alert("Enter an event type.");
      return;
    }

    let payload;
    const raw = eventPayload.trim();

    if (!raw) {
      payload = {};
    } else {
      try {
        payload = JSON.parse(raw);
      } catch {
        // fallback: wrap as text
        payload = { text: raw };
      }
    }

    try {
      await createMissionEvent({
        session_id: selectedSession.id,
        event_type: eventType.trim(),
        payload,
      });

      const ev = await listMissionEvents(selectedSession.id);
      setEvents(ev || []);

      setEventType("");
      setEventPayload("");
    } catch (err) {
      console.error("Failed creating event:", err);
      alert("Error creating event. See console.");
    }
  }

  /* -------------------------------------------------------------
     HANDLERS: NPC CREATION & ASSIGNMENT
  ------------------------------------------------------------- */

  function openNpcModal() {
    setNpcForm({
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
      setAllNPCs((prev) => [...prev, res.npc]);

      setNpcModalOpen(false);
      alert("NPC created!");
    } catch (err) {
      console.error("Failed to create NPC:", err);
      alert("Error creating NPC. Check console and JSON fields.");
    }
  }

  async function handleAssignNPC(npcId) {
    if (!selectedMissionId || !npcId) return;
    try {
      const res = await addNPCtoMission({
        mission_id: selectedMissionId,
        npc_id: npcId,
        is_known: true,
      });

      setMissionNPCs((prev) => [...prev, res.mission_npc]);
    } catch (err) {
      console.error("Error assigning NPC:", err);
      alert("Could not assign NPC. See console.");
    }
  }

  /* -------------------------------------------------------------
     HANDLERS: NPC JSON IMPORT
  ------------------------------------------------------------- */

  function triggerNpcImport() {
    setNpcImportStatus(null);
    fileInputRef.current?.click();
  }

  async function handleNpcFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const npcsToCreate = Array.isArray(parsed) ? parsed : [parsed];

      for (const npc of npcsToCreate) {
        await createNPC(npc);
      }

      const npcRes = await getAllNPCs();
      setAllNPCs(npcRes.npcs || []);

      setNpcImportStatus(`Imported ${npcsToCreate.length} NPC(s).`);
    } catch (err) {
      console.error("NPC import failed:", err);
      setNpcImportStatus("Import failed. See console for details.");
    } finally {
      e.target.value = "";
    }
  }

  /* -------------------------------------------------------------
     HANDLERS: NPC STATE SAVE
  ------------------------------------------------------------- */

  async function handleSaveNpcState() {
    if (!selectedSession || !selectedNpcForState) {
      alert("Select a session and NPC first.");
      return;
    }

    try {
      const parsed = JSON.parse(npcStateRaw || "{}");

      await updateNPCState({
        session_id: selectedSession.id,
        npc_id: selectedNpcForState,
        state: parsed,
      });

      alert("NPC state saved.");
    } catch (err) {
      console.error("Failed saving NPC state:", err);
      alert("Error saving NPC state. Ensure JSON is valid.");
    }
  }

  /* -------------------------------------------------------------
     DIAGNOSTICS HARNESS
  ------------------------------------------------------------- */

  async function runDiagnostics() {
    setDiagnosticsRunning(true);
    setDiagnosticsResults([]);

    const results = [];

    async function test(name, fn) {
      try {
        await fn();
        results.push({ name, status: "ok" });
      } catch (err) {
        console.error(`Diag ${name} failed:`, err);
        results.push({
          name,
          status: "fail",
          message: err.message || "Unknown error",
        });
      }
      setDiagnosticsResults([...results]);
    }

    // 1) Missions
    await test("listMissions", async () => {
      const m = await listMissions();
      if (!Array.isArray(m)) throw new Error("Expected array");
    });

    let diagMissionId = selectedMissionId;

    if (!diagMissionId) {
      await test("createDiagnosticMission", async () => {
        const res = await createMission({ name: "Diagnostics Campaign" });
        diagMissionId = res.mission.id;
      });
    }

    // 2) Sessions
    let diagSessionId = selectedSession?.id;

    await test("listMissionSessions", async () => {
      if (!diagMissionId) return;
      const s = await listMissionSessions(diagMissionId);
      if (!Array.isArray(s)) throw new Error("Expected array");
      if (s.length && !diagSessionId) {
        diagSessionId = s[0].id;
      }
    });

    if (!diagSessionId && diagMissionId) {
      await test("createDiagnosticSession", async () => {
        const res = await createMissionSession({
          mission_id: diagMissionId,
          session_name: "Diagnostics Session",
        });
        diagSessionId = res.session.id;
      });
    }

    // 3) Session players
    await test("listSessionPlayers", async () => {
      if (!diagSessionId) return;
      await listSessionPlayers(diagSessionId);
    });

    // 4) Events
    await test("listMissionEvents", async () => {
      if (!diagSessionId) return;
      await listMissionEvents(diagSessionId);
    });

    // 5) Messages
    await test("listMissionMessages", async () => {
      if (!diagMissionId) return;
      await listMissionMessages(diagMissionId);
    });

    // 6) NPC catalog
    await test("getAllNPCs", async () => {
      await getAllNPCs();
    });

    // 7) Mission NPCs
    await test("listMissionNPCs", async () => {
      if (!diagMissionId) return;
      await listMissionNPCs(diagMissionId);
    });

    setDiagnosticsRunning(false);
  }

  /* -------------------------------------------------------------
     RENDER HELPERS
  ------------------------------------------------------------- */

  const currentMission = missions.find((m) => m.id === selectedMissionId);

  function renderTabContent() {
    if (!selectedSession) {
      return (
        <div className="empty-state">
          Select a session to view details.
        </div>
      );
    }

    switch (activeTab) {
      case "session":
        return (
          <div className="session-data">
            <div className="session-row">
              <span className="label">Campaign:</span>
              <span>{currentMission?.name || "Unknown"}</span>
            </div>
            <div className="session-row">
              <span className="label">Session:</span>
              <span>{selectedSession.session_name}</span>
            </div>
            <div className="session-row">
              <span className="label">Status:</span>
              <span>{selectedSession.status || "unknown"}</span>
            </div>
            <div className="session-row">
              <span className="label">Started:</span>
              <span>{selectedSession.started_at || "—"}</span>
            </div>
            <div className="session-row">
              <span className="label">Ended:</span>
              <span>{selectedSession.ended_at || "—"}</span>
            </div>
            <div className="session-row">
              <span className="label">GM Notes:</span>
              <span>{selectedSession.gm_notes || "—"}</span>
            </div>
          </div>
        );

      case "players":
        return (
          <div className="players-tab">
            <div className="two-col">
              <div className="col">
                <h3>Add Player</h3>
                <div className="field">
                  <label>Player Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={playerPhone}
                    onChange={(e) => setPlayerPhone(e.target.value)}
                  />
                </div>
                <button onClick={handleAddPlayer}>Add Player</button>
              </div>

              <div className="col">
                <h3>Players in Session</h3>
                <ul className="player-list">
                  {players.map((p) => (
                    <li key={p.id}>
                      <span className="player-name">
                        {p.player_name || "(no name)"}
                      </span>
                      <span className="player-phone">{p.phone_number}</span>
                    </li>
                  ))}
                  {players.length === 0 && (
                    <li className="muted">No players yet.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        );

      case "events":
        return (
          <div className="events-tab">
            <div className="two-col">
              <div className="col">
                <h3>Create Event</h3>
                <div className="field">
                  <label>Event Type</label>
                  <input
                    type="text"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Payload (JSON or text)</label>
                  <textarea
                    rows={6}
                    value={eventPayload}
                    onChange={(e) => setEventPayload(e.target.value)}
                  />
                </div>
                <button onClick={handleAddEvent}>Add Event</button>
              </div>

              <div className="col">
                <h3>Events</h3>
                <ul className="event-list">
                  {events.map((ev) => (
                    <li key={ev.id}>
                      <div className="event-type">{ev.event_type}</div>
                      <pre className="event-payload">
                        {JSON.stringify(ev.payload, null, 2)}
                      </pre>
                    </li>
                  ))}
                  {events.length === 0 && (
                    <li className="muted">No events yet.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        );

      case "messages":
        return (
          <div className="messages-tab">
            <h3>Messages (read-only log)</h3>
            <ul className="msg-list">
              {messages.map((m) => (
                <li key={m.id}>
                  <div className="msg-meta">
                    <span className="msg-direction">
                      {m.direction || (m.is_from_player ? "player" : "gm")}
                    </span>
                    <span className="msg-phone">{m.phone_number}</span>
                    <span className="msg-time">
                      {m.created_at || m.timestamp || ""}
                    </span>
                  </div>
                  <div className="msg-body">{m.body}</div>
                </li>
              ))}
              {messages.length === 0 && (
                <li className="muted">No messages yet.</li>
              )}
            </ul>
            <p className="muted small">
              Note: composing/sending messages from here is not wired yet; this
              view is a log only.
            </p>
          </div>
        );

      case "npc":
        return (
          <div className="npc-tab">
            <div className="two-col">
              <div className="col">
                <h3>NPCs in Campaign</h3>
                <ul className="npc-list">
                  {missionNPCs.map((mNpc) => (
                    <li
                      key={mNpc.id}
                      className={
                        mNpc.npc_id === selectedNpcForState ? "active" : ""
                      }
                      onClick={() => {
                        setSelectedNpcForState(mNpc.npc_id);
                      }}
                    >
                      {mNpc.display_name || `NPC #${mNpc.npc_id}`}
                    </li>
                  ))}
                  {missionNPCs.length === 0 && (
                    <li className="muted">No NPCs attached yet.</li>
                  )}
                </ul>
                <p className="muted small">
                  Click an NPC to load its per-session memory.
                </p>
              </div>

              <div className="col">
                <h3>NPC Memory / State</h3>
                {npcStateLoading && <div>Loading state…</div>}
                {npcStateError && (
                  <div className="error">{npcStateError}</div>
                )}
                <textarea
                  rows={16}
                  value={npcStateRaw}
                  onChange={(e) => setNpcStateRaw(e.target.value)}
                />
                <button onClick={handleSaveNpcState}>Save NPC State</button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  /* -------------------------------------------------------------
     MAIN RENDER
  ------------------------------------------------------------- */

  return (
    <div className="mission-manager">
      <h1>CAMPAIGN MANAGER</h1>

      <div className="top-tabs">
        <button
          className={activeTab === "session" ? "active" : ""}
          onClick={() => setActiveTab("session")}
        >
          SESSION DATA
        </button>
        <button
          className={activeTab === "players" ? "active" : ""}
          onClick={() => setActiveTab("players")}
        >
          PLAYERS
        </button>
        <button
          className={activeTab === "events" ? "active" : ""}
          onClick={() => setActiveTab("events")}
        >
          EVENTS
        </button>
        <button
          className={activeTab === "messages" ? "active" : ""}
          onClick={() => setActiveTab("messages")}
        >
          MESSAGES
        </button>
        <button
          className={activeTab === "npc" ? "active" : ""}
          onClick={() => setActiveTab("npc")}
        >
          NPC MEMORY
        </button>
      </div>

      <div className="columns">
        {/* LEFT COLUMN */}
        <div className="left-col">
          <section>
            <h2>CAMPAIGN</h2>
            <label>SELECT CAMPAIGN</label>
            <select
              value={selectedMissionId || ""}
              onChange={(e) =>
                setSelectedMissionId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
            >
              <option value="">Select Campaign</option>
              {missions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button onClick={handleCreateMission}>CREATE CAMPAIGN</button>
          </section>

          <section>
            <h2>SESSIONS</h2>
            <select
              value={selectedSession?.id || ""}
              onChange={(e) => {
                const id = Number(e.target.value);
                const found = sessions.find((s) => s.id === id);
                setSelectedSession(found || null);
              }}
            >
              <option value="">Select Session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.session_name}
                </option>
              ))}
            </select>
            <button onClick={handleCreateSession}>NEW SESSION</button>
          </section>

          <section>
            <h2>NPCS IN CAMPAIGN</h2>
            <button onClick={openNpcModal}>CREATE NEW NPC</button>
            <button onClick={triggerNpcImport}>IMPORT NPC JSON</button>
            {npcImportStatus && (
              <div className="muted small">{npcImportStatus}</div>
            )}

            <label>ASSIGN NPC</label>
            <select
              onChange={(e) =>
                handleAssignNPC(
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            >
              <option value="">Choose NPC</option>
              {allNPCs.map((npc) => (
                <option key={npc.id} value={npc.id}>
                  {npc.display_name}
                </option>
              ))}
            </select>
          </section>

          <section className="diagnostics">
            <h2>DIAGNOSTICS</h2>
            <button
              onClick={() => {
                if (!showDiagnostics) {
                  setDiagnosticsResults([]);
                }
                setShowDiagnostics((v) => !v);
              }}
            >
              {showDiagnostics ? "HIDE" : "SHOW"} DIAGNOSTICS
            </button>
            {showDiagnostics && (
              <>
                <button
                  disabled={diagnosticsRunning}
                  onClick={runDiagnostics}
                >
                  {diagnosticsRunning ? "RUNNING…" : "RUN API SELF-TEST"}
                </button>
                <ul className="diag-list">
                  {diagnosticsResults.map((r, i) => (
                    <li key={i} className={r.status}>
                      <span className="diag-name">{r.name}</span>
                      <span className="diag-status">{r.status}</span>
                      {r.message && (
                        <span className="diag-msg"> — {r.message}</span>
                      )}
                    </li>
                  ))}
                  {diagnosticsResults.length === 0 && !diagnosticsRunning && (
                    <li className="muted small">
                      No tests run yet. Click "RUN API SELF-TEST".
                    </li>
                  )}
                </ul>
              </>
            )}
          </section>

          {/* hidden file input for NPC JSON import */}
          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleNpcFileChange}
          />
        </div>

        {/* RIGHT COLUMN */}
        <div className="right-col">{renderTabContent()}</div>
      </div>

      {/* NPC CREATION MODAL */}
      {npcModalOpen && (
        <div className="npc-modal">
          <div className="npc-modal-content">
            <h2>Create NPC</h2>

            {Object.keys(npcForm).map((key) => (
              <div className="field" key={key}>
                <label>{key}</label>
                <textarea
                  rows={key.endsWith("_json") ? 6 : 2}
                  value={npcForm[key]}
                  onChange={(e) =>
                    setNpcForm((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}

            <div className="modal-actions">
              <button onClick={submitNewNPC}>Save NPC</button>
              <button onClick={() => setNpcModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
