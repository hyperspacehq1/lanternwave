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
} from "../api";

export default function MissionManagerPage() {
  const [adminKey, setAdminKeyState] = useState(getStoredAdminKey());
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const [error, setError] = useState("");
  const [tab, setTab] = useState("players");

  // New session form
  const [missionId, setMissionId] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [gmNotes, setGmNotes] = useState("");

  // Players tab
  const [players, setPlayers] = useState([]);
  const [newPhone, setNewPhone] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");

  // Events tab
  const [events, setEvents] = useState([]);

  // Logs tab
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!adminKey) return;
    refreshSessions();
  }, [adminKey]);

  useEffect(() => {
    if (!selectedSessionId) {
      setSelectedSession(null);
      return;
    }
    loadSession(selectedSessionId);
  }, [selectedSessionId]);

  useEffect(() => {
    if (!selectedSession) return;

    if (tab === "players") refreshPlayers();
    if (tab === "events") refreshEvents();
    if (tab === "logs") refreshLogs();
  }, [tab, selectedSession]);

  // Save admin key
  const handleSaveKey = () => {
    setStoredAdminKey(adminKey);
    refreshSessions();
  };

  // --------------------------
  // Load sessions
  // --------------------------
  const refreshSessions = async () => {
    setError("");
    try {
      const data = await listSessions();
      setSessions(data || []);
      // auto select first
      if (!selectedSessionId && data.length > 0) {
        setSelectedSessionId(data[0].id);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  // --------------------------
  // Load single session
  // --------------------------
  const loadSession = async (id) => {
    setError("");
    try {
      const data = await getSession(id);
      setSelectedSession(data || null);
    } catch (e) {
      setError(e.message);
    }
  };

  // --------------------------
  // Create new session
  // --------------------------
  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!missionId || !sessionName) {
      setError("Mission ID and Name required");
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

  // --------------------------
  // Save session details
  // --------------------------
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

  // --------------------------
  // Reset mission (delete session)
  // --------------------------
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

  // --------------------------
  // Players
  // --------------------------
  const refreshPlayers = async () => {
    try {
      const data = await listSessionPlayers(selectedSession.id);
      setPlayers(data || []);
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
    const ok = window.confirm(`Remove ${phone}?`);
    if (!ok) return;
    try {
      await removeSessionPlayer(selectedSession.id, phone);
      refreshPlayers();
    } catch (e) {
      setError(e.message);
    }
  };

  // --------------------------
  // Events
  // --------------------------
  const refreshEvents = async () => {
    try {
      const data = await listSessionEvents(selectedSession.id);
      setEvents(data || []);
    } catch (e) {
      setError(e.message);
    }
  };

  // --------------------------
  // Logs
  // --------------------------
  const refreshLogs = async () => {
    try {
      const data = await listSessionLogs(selectedSession.id);
      setLogs(data || []);
    } catch (e) {
      setError(e.message);
    }
  };

  // ======================================================
  //  RENDER UI — using LW panels & theme
  // ======================================================
  return (
    <div className="lw-console" style={{ width: "100%" }}>
      {/* LEFT PANEL: sessions */}
      <div className="lw-panel">
        <h2 className="lw-panel-title">Mission Runs</h2>

        {/* Admin Key */}
        <div style={{ marginBottom: "0.7rem" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--lw-text-subtle)" }}>
            ADMIN KEY
          </div>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKeyState(e.target.value)}
            className="lw-input"
            style={{
              width: "100%",
              marginTop: "0.25rem",
              padding: "0.35rem",
              background: "#000",
              color: "var(--lw-green)",
              border: "1px solid var(--lw-border)",
              borderRadius: "6px",
            }}
          />
          <button
            className="lw-btn"
            style={{ marginTop: "0.3rem", width: "100%" }}
            onClick={handleSaveKey}
          >
            Save Key
          </button>
        </div>

        {/* Sessions List */}
        <div
          className="lw-clip-list"
          style={{ flex: 1, overflowY: "auto", marginTop: "0.5rem" }}
        >
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

        {/* Create Session */}
        <form
          onSubmit={handleCreateSession}
          style={{ marginTop: "0.7rem", fontSize: "0.75rem" }}
        >
          <div style={{ marginBottom: "0.3rem" }}>Create New Run</div>
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

      {/* CENTER + RIGHT depend on session */}
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

            {/* Session Name */}
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

            {/* Status */}
            <div style={{ marginTop: "0.5rem", fontSize: "0.75rem" }}>
              Status
            </div>
            <select
              value={selectedSession.status}
              onChange={(e) =>
                setSelectedSession((s) => ({
                  ...s,
                  status: e.target.value,
                }))
              }
              className="lw-input"
              style={inputStyle}
            >
              <option value="new">new</option>
              <option value="in_progress">in_progress</option>
              <option value="completed">completed</option>
              <option value="abandoned">abandoned</option>
            </select>

            {/* GM Notes */}
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

            {/* Save */}
            <button
              className="lw-btn"
              style={{ marginTop: "0.5rem", width: "100%" }}
              onClick={handleSaveSession}
            >
              Save
            </button>

            {/* Reset */}
            <button
              className="lw-btn lw-btn-danger"
              style={{ marginTop: "0.5rem", width: "100%" }}
              onClick={handleResetMission}
            >
              Reset Mission
            </button>
          </div>

          {/* RIGHT PANEL: Tabs */}
          <div className="lw-panel">
            <h2 className="lw-panel-title">Run Data</h2>

            {/* Tabs */}
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
            </div>

            {/* TAB CONTENT */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {tab === "players" && (
                <PlayersTab
                  players={players}
                  onAdd={handleAddPlayer}
                  onRemove={handleRemovePlayer}
                  newPhone={newPhone}
                  newPlayerName={newPlayerName}
                  setNewPhone={setNewPhone}
                  setNewPlayerName={setNewPlayerName}
                />
              )}

              {tab === "events" && <EventsTab events={events} />}
              {tab === "logs" && <LogsTab logs={logs} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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
        <div
          key={p.id}
          className="lw-clip-row"
          style={{ marginBottom: "0.3rem" }}
        >
          <div className="lw-clip-main">
            <div className="lw-clip-type">P</div>
            <div>{p.phone_number}</div>
          </div>
          <div style={{ display: "flex", gap: "0.3rem" }}>
            <button
              className="lw-btn lw-btn-danger"
              onClick={() => onRemove(p.phone_number)}
            >
              X
            </button>
          </div>
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
        <div
          key={ev.id}
          className="lw-clip-row"
          style={{ marginBottom: "0.3rem" }}
        >
          <div className="lw-clip-main" style={{ flexDirection: "column" }}>
            <div className="lw-clip-type">{ev.event_type}</div>
            <pre
              style={{
                fontSize: "0.7rem",
                color: "var(--lw-text-subtle)",
                whiteSpace: "pre-wrap",
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
        <div
          key={log.id}
          className="lw-clip-row"
          style={{ marginBottom: "0.3rem" }}
        >
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
