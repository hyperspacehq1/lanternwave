// src/pages/MissionManagerPage.jsx
import React, { useEffect, useState } from "react";

import {
  getStoredAdminKey,
  setStoredAdminKey,
  listSessions,
  createSession,
  getSession,
  updateSession,
  resetSession,
  listSessionPlayers,
  addSessionPlayer,
  removeSessionPlayer,
  listSessionEvents,
  listSessionLogs,
  getNpcState,
  updateNpcState,
} from "../lib/mission-api.js"; // <-- Correct import path

// Reusable input styling for LW theme
const inputStyle = {
  width: "100%",
  padding: "0.3rem",
  background: "#000",
  color: "var(--lw-green)",
  border: "1px solid var(--lw-border)",
  borderRadius: "6px",
  fontSize: "0.75rem",
};

const activeTabStyle = {
  borderColor: "var(--lw-green)",
  color: "var(--lw-green)",
};

export default function MissionManagerPage() {
  const [adminKey, setAdminKeyState] = useState(getStoredAdminKey());
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const [error, setError] = useState("");
  const [tab, setTab] = useState("players");

  // form states
  const [missionId, setMissionId] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [gmNotes, setGmNotes] = useState("");

  // players
  const [players, setPlayers] = useState([]);
  const [newPhone, setNewPhone] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");

  // events
  const [events, setEvents] = useState([]);

  // logs
  const [logs, setLogs] = useState([]);

  // refresh sessions when admin key saved
  useEffect(() => {
    if (!adminKey) return;
    refreshSessions();
  }, [adminKey]);

  // load selected session
  useEffect(() => {
    if (!selectedSessionId) return setSelectedSession(null);
    loadSession(selectedSessionId);
  }, [selectedSessionId]);

  // load tab content
  useEffect(() => {
    if (!selectedSession) return;

    if (tab === "players") refreshPlayers();
    if (tab === "events") refreshEvents();
    if (tab === "logs") refreshLogs();
    // NPC tab loads on-demand
  }, [tab, selectedSession]);

  const handleSaveKey = () => {
    setStoredAdminKey(adminKey);
    refreshSessions();
  };

  // -----------------------
  // SESSIONS
  // -----------------------
  const refreshSessions = async () => {
    setError("");
    try {
      const data = await listSessions();
      setSessions(data);
      if (!selectedSessionId && data.length > 0) {
        setSelectedSessionId(data[0].id);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const loadSession = async (id) => {
    try {
      const data = await getSession(id);
      setSelectedSession(data);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!missionId || !sessionName) {
      setError("Mission ID and Session Name are required.");
      return;
    }

    try {
      await createSession(Number(missionId), sessionName, gmNotes);
      setMissionId("");
      setSessionName("");
      setGmNotes("");
      refreshSessions();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSaveSession = async () => {
    if (!selectedSession) return;
    try {
      const upd = await updateSession(selectedSession.id, {
        session_name: selectedSession.session_name,
        gm_notes: selectedSession.gm_notes,
        status: selectedSession.status,
      });
      setSelectedSession(upd);
      refreshSessions();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleResetMission = async () => {
    if (!selectedSession) return;
    const ok = window.confirm(
      `Reset mission:\n${selectedSession.session_name}\n\nThis wipes players, logs, and NPC state.`
    );
    if (!ok) return;

    try {
      await resetSession(selectedSession.id);
      setSelectedSessionId(null);
      refreshSessions();
    } catch (e) {
      setError(e.message);
    }
  };

  // -----------------------
  // PLAYERS
  // -----------------------
  const refreshPlayers = async () => {
    try {
      const data = await listSessionPlayers(selectedSession.id);
      setPlayers(data);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPhone) return;

    try {
      await addSessionPlayer(selectedSession.id, newPhone, newPlayerName);
      setNewPhone("");
      setNewPlayerName("");
      refreshPlayers();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleRemovePlayer = async (phone) => {
    const ok = window.confirm(`Remove: ${phone}?`);
    if (!ok) return;

    try {
      await removeSessionPlayer(selectedSession.id, phone);
      refreshPlayers();
    } catch (e) {
      setError(e.message);
    }
  };

  // -----------------------
  // EVENTS
  // -----------------------
  const refreshEvents = async () => {
    try {
      const data = await listSessionEvents(selectedSession.id);
      setEvents(data);
    } catch (e) {
      setError(e.message);
    }
  };

  // -----------------------
  // LOGS
  // -----------------------
  const refreshLogs = async () => {
    try {
      const data = await listSessionLogs(selectedSession.id);
      setLogs(data);
    } catch (e) {
      setError(e.message);
    }
  };

  // =================================================================
  //  RENDER
  // =================================================================
  return (
    <div className="lw-console" style={{ width: "100%" }}>
      {/* ---------------- LEFT PANEL ---------------- */}
      <div className="lw-panel">
        <h2 className="lw-panel-title">Mission Runs</h2>

        {/* ADMIN KEY */}
        <div style={{ marginBottom: "0.7rem" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--lw-text-subtle)" }}>
            ADMIN KEY
          </div>

          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKeyState(e.target.value)}
            className="lw-input"
            style={inputStyle}
          />

          <button
            className="lw-btn"
            style={{ marginTop: "0.3rem", width: "100%" }}
            onClick={handleSaveKey}
          >
            Save Key
          </button>
        </div>

        {/* SESSION LIST */}
        <div className="lw-clip-list" style={{ flex: 1, overflowY: "auto" }}>
          {sessions.map((s) => (
            <div
              key={s.id}
              className={
                "lw-clip-row" +
                (s.id === selectedSessionId ? " lw-clip-row-active" : "")
              }
              onClick={() => setSelectedSessionId(s.id)}
              style={{ cursor: "pointer" }}
            >
              <div className="lw-clip-main">
                <div className="lw-clip-type">RUN</div>
                <div className="lw-clip-name">{s.session_name}</div>
              </div>
              <div style={{ fontSize: "0.6rem" }}>{s.status}</div>
            </div>
          ))}
        </div>

        {/* CREATE SESSION */}
        <form onSubmit={handleCreateSession} style={{ marginTop: "0.7rem" }}>
          <div style={{ marginBottom: "0.3rem", fontSize: "0.7rem" }}>
            Create New Run
          </div>

          <input
            type="number"
            placeholder="Mission ID"
            value={missionId}
            onChange={(e) => setMissionId(e.target.value)}
            className="lw-input"
            style={inputStyle}
          />

          <input
            type="text"
            placeholder="Session Name"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="lw-input"
            style={inputStyle}
          />

          <textarea
            placeholder="GM Notes"
            value={gmNotes}
            onChange={(e) => setGmNotes(e.target.value)}
            className="lw-input"
            style={{ ...inputStyle, height: "60px" }}
          />

          <button className="lw-btn" style={{ width: "100%" }}>
            Create
          </button>
        </form>
      </div>

      {/* ---------------- RIGHT PANELS ---------------- */}
      {!selectedSession ? (
        <div className="lw-panel">
          <h2 className="lw-panel-title">Details</h2>
          <div style={{ fontSize: "0.8rem", color: "var(--lw-text-subtle)" }}>
            Select a mission run on the left.
          </div>
        </div>
      ) : (
        <>
          {/* CENTER PANEL */}
          <div className="lw-panel">
            <h2 className="lw-panel-title">Run Details</h2>

            <input
              type="text"
              value={selectedSession.session_name}
              onChange={(e) =>
                setSelectedSession((s) => ({
                  ...s,
                  session_name: e.target.value,
                }))
              }
              className="lw-input"
              style={inputStyle}
            />

            <div style={{ marginTop: "0.5rem", fontSize: "0.75rem" }}>
              Status
            </div>

            <select
              value={selectedSession.status}
              onChange={(e) =>
                setSelectedSession((s) => ({ ...s, status: e.target.value }))
              }
              className="lw-input"
              style={inputStyle}
            >
              <option value="new">new</option>
              <option value="in_progress">in_progress</option>
              <option value="completed">completed</option>
              <option value="abandoned">abandoned</option>
            </select>

            <div style={{ marginTop: "0.5rem", fontSize: "0.75rem" }}>
              GM Notes
            </div>

            <textarea
              value={selectedSession.gm_notes || ""}
              onChange={(e) =>
                setSelectedSession((s) => ({
                  ...s,
                  gm_notes: e.target.value,
                }))
              }
              className="lw-input"
              style={{ ...inputStyle, height: "100px" }}
            />

            <button
              className="lw-btn"
              style={{ marginTop: "0.5rem", width: "100%" }}
              onClick={handleSaveSession}
            >
              Save
            </button>

            <button
              className="lw-btn lw-btn-danger"
              style={{ marginTop: "0.5rem", width: "100%" }}
              onClick={handleResetMission}
            >
              Reset Mission
            </button>
          </div>

          {/* RIGHT PANEL */}
          <div className="lw-panel">
            <h2 className="lw-panel-title">Run Data</h2>

            {/* TABS */}
            <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.5rem" }}>
              <button
                className="lw-btn"
                style={tab === "players" ? activeTabStyle : {}}
                onClick={() => setTab("players")}
              >
                Players
              </button>

              <button
                className="lw-btn"
                style={tab === "events" ? activeTabStyle : {}}
                onClick={() => setTab("events")}
              >
                Events
              </button>

              <button
                className="lw-btn"
                style={tab === "logs" ? activeTabStyle : {}}
                onClick={() => setTab("logs")}
              >
                Logs
              </button>

              {/* NEW NPC STATE TAB */}
              <button
                className="lw-btn"
                style={tab === "npc" ? activeTabStyle : {}}
                onClick={() => setTab("npc")}
              >
                NPC State
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {tab === "players" && (
                <PlayersTab
                  players={players}
                  newPhone={newPhone}
                  newPlayerName={newPlayerName}
                  setNewPhone={setNewPhone}
                  setNewPlayerName={setNewPlayerName}
                  onAdd={handleAddPlayer}
                  onRemove={handleRemovePlayer}
                />
              )}

              {tab === "events" && <EventsTab events={events} />}
              {tab === "logs" && <LogsTab logs={logs} />}

              {tab === "npc" && (
                <NpcStateTab
                  session={selectedSession}
                  players={players}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// -------------------------------------------------------
// SUBCOMPONENTS
// -------------------------------------------------------

function PlayersTab({
  players,
  newPhone,
  newPlayerName,
  setNewPhone,
  setNewPlayerName,
  onAdd,
  onRemove,
}) {
  return (
    <div>
      <form
        onSubmit={onAdd}
        style={{ display: "flex", gap: "0.3rem", marginBottom: "0.5rem" }}
      >
        <input
          type="text"
          placeholder="Phone"
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
          className="lw-input"
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Name"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          className="lw-input"
          style={inputStyle}
        />
        <button className="lw-btn">Add</button>
      </form>

      {players.length === 0 && (
        <div style={{ fontSize: "0.75rem", color: "var(--lw-text-subtle)" }}>
          No players yet.
        </div>
      )}

      {players.map((p) => (
        <div key={p.id} className="lw-clip-row">
          <div className="lw-clip-main">
            <div className="lw-clip-type">P</div>
            <div>{p.phone_number}</div>
          </div>

          <button
            className="lw-btn lw-btn-danger"
            onClick={() => onRemove(p.phone_number)}
          >
            X
          </button>
        </div>
      ))}
    </div>
  );
}

function EventsTab({ events }) {
  if (!events.length)
    return (
      <div style={{ fontSize: "0.75rem", color: "var(--lw-text-subtle)" }}>
        No events yet.
      </div>
    );

  return (
    <div>
      {events.map((ev) => (
        <div key={ev.id} className="lw-clip-row">
          <div className="lw-clip-main" style={{ flexDirection: "column" }}>
            <div className="lw-clip-type">{ev.event_type}</div>
            <pre
              style={{
                fontSize: "0.7rem",
                whiteSpace: "pre-wrap",
                color: "var(--lw-text-subtle)",
              }}
            >
              {JSON.stringify(ev.event_data, null, 2)}
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
}

function LogsTab({ logs }) {
  if (!logs.length)
    return (
      <div style={{ fontSize: "0.75rem", color: "var(--lw-text-subtle)" }}>
        No logs yet.
      </div>
    );

  return (
    <div>
      {logs.map((log) => (
        <div key={log.id} className="lw-clip-row">
          <div className="lw-clip-main" style={{ flexDirection: "column" }}>
            <div className="lw-clip-type">{log.direction}</div>
            <div style={{ fontSize: "0.7rem" }}>
              {log.timestamp} — {log.phone_number}
            </div>
            <pre
              style={{
                fontSize: "0.7rem",
                whiteSpace: "pre-wrap",
                color: "var(--lw-text-subtle)",
              }}
            >
              {log.body}
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
}

// -----------------------------
// NPC STATE TAB
// -----------------------------
function NpcStateTab({ session, players }) {
  const [npcId, setNpcId] = useState("");
  const [phone, setPhone] = useState("");
  const [npcState, setNpcState] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadState = async () => {
    if (!npcId || !phone) return;
    setLoading(true);

    try {
      const data = await getNpcState(
        session.id,
        npcId,
        phone
      );
      setNpcState(data || {});
    } catch (e) {
      console.error(e);
      alert("Error loading NPC state.");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!npcId || !phone) return;

    try {
      await updateNpcState(
        session.id,
        npcId,
        phone,
        {
          knowledge_json: npcState.knowledge_json,
          flags_json: npcState.flags_json,
          trust_level: npcState.trust_level,
        }
      );
      alert("NPC state saved.");
    } catch (e) {
      console.error(e);
      alert("Error saving NPC state.");
    }
  };

  const handleReset = async () => {
    const ok = window.confirm("Reset this NPC's memory?");
    if (!ok) return;

    try {
      await updateNpcState(
        session.id,
        npcId,
        phone,
        {
          knowledge_json: {},
          flags_json: {},
          trust_level: 0,
        }
      );
      setNpcState({
        knowledge_json: {},
        flags_json: {},
        trust_level: 0,
      });
    } catch (e) {
      alert("Error resetting NPC.");
    }
  };

  return (
    <div style={{ fontSize: "0.75rem" }}>
      {/* NPC + PLAYER SELECT */}
      <div style={{ marginBottom: "0.5rem" }}>
        <div>NPC ID</div>
        <input
          type="text"
          placeholder="NPC ID"
          value={npcId}
          onChange={(e) => setNpcId(e.target.value)}
          className="lw-input"
          style={inputStyle}
        />

        <div style={{ marginTop: "0.3rem" }}>Select Player</div>
        <select
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="lw-input"
          style={inputStyle}
        >
          <option value="">Choose player...</option>
          {players.map((p) => (
            <option key={p.phone_number} value={p.phone_number}>
              {p.phone_number} {p.player_name ? `(${p.player_name})` : ""}
            </option>
          ))}
        </select>

        <button className="lw-btn" style={{ marginTop: "0.3rem" }} onClick={loadState}>
          Load NPC State
        </button>
      </div>

      {/* STATE EDITOR */}
      {loading && <div>Loading NPC state...</div>}

      {!loading && npcState && (
        <div className="lw-panel" style={{ marginTop: "0.5rem" }}>
          <h3 className="lw-panel-title">NPC Memory</h3>

          {/* KNOWLEDGE */}
          <div style={{ marginTop: "0.5rem" }}>
            <strong>Knowledge JSON</strong>
            <textarea
              className="lw-input"
              style={{ ...inputStyle, height: "120px" }}
              value={JSON.stringify(npcState.knowledge_json || {}, null, 2)}
              onChange={(e) =>
                setNpcState((s) => ({
                  ...s,
                  knowledge_json: safeJsonParse(e.target.value)
                }))
              }
            />
          </div>

          {/* FLAGS */}
          <div style={{ marginTop: "0.5rem" }}>
            <strong>Flags JSON</strong>
            <textarea
              className="lw-input"
              style={{ ...inputStyle, height: "120px" }}
              value={JSON.stringify(npcState.flags_json || {}, null, 2)}
              onChange={(e) =>
                setNpcState((s) => ({
                  ...s,
                  flags_json: safeJsonParse(e.target.value)
                }))
              }
            />
          </div>

          {/* TRUST */}
          <div style={{ marginTop: "0.5rem" }}>
            <strong>Trust Level</strong>
            <input
              type="number"
              className="lw-input"
              style={inputStyle}
              value={npcState.trust_level || 0}
              onChange={(e) =>
                setNpcState((s) => ({
                  ...s,
                  trust_level: Number(e.target.value)
                }))
              }
            />
          </div>

          {/* ACTIONS */}
          <button
            className="lw-btn"
            style={{ marginTop: "0.5rem" }}
            onClick={handleSave}
          >
            Save NPC State
          </button>

          <button
            className="lw-btn lw-btn-danger"
            style={{ marginTop: "0.5rem" }}
            onClick={handleReset}
          >
            Reset Memory
          </button>
        </div>
      )}
    </div>
  );
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}
