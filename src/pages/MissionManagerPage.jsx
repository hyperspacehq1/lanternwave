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
} from "../lib/mission-api.js";

const inputStyle = {
  width: "100%",
  padding: "4px",
  fontSize: "0.8rem",
  background: "black",
  color: "var(--lw-green)",
  border: "1px solid var(--lw-green-dim)",
};

const activeTabStyle = {
  background: "var(--lw-green)",
  color: "black",
};

export default function MissionManagerPage() {
  const [adminKey, setAdminKey] = useState(getStoredAdminKey());
  const [adminEntered, setAdminEntered] = useState(!!getStoredAdminKey());

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // CREATE SESSION FORM
  const [missionId, setMissionId] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [gmNotes, setGmNotes] = useState("");

  // SESSION LIST
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  // TABS
  const [tab, setTab] = useState("players");

  useEffect(() => {
    if (adminEntered) {
      refreshSessions();
    }
  }, [adminEntered]);

  async function refreshSessions() {
    try {
      setLoading(true);
      const data = await listSessions();
      setSessions(data || []);
    } catch (e) {
      console.error("refreshSessions error:", e);
      setError("Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  }

  function handleAdminKeySubmit(e) {
    e.preventDefault();
    setError("");

    console.log("[MissionManager] Admin key submitted:", adminKey);

    if (!adminKey.trim()) {
      setError("Admin Key is required.");
      return;
    }

    setStoredAdminKey(adminKey.trim());
    setAdminEntered(true);
  }

  // CREATE SESSION
  const handleCreateSession = async (e) => {
    e.preventDefault();
    setError("");

    console.log(
      "[MissionManager] Create clicked",
      "missionId =", missionId,
      "sessionName =", sessionName
    );

    // Validate INPUT — prevent silent failure
    if (!missionId || Number(missionId) < 1) {
      setError("Mission ID must be ≥ 1.");
      console.warn("[MissionManager] Create blocked: invalid missionId");
      return;
    }

    if (!sessionName.trim()) {
      setError("Session Name is required.");
      console.warn("[MissionManager] Create blocked: empty sessionName");
      return;
    }

    try {
      const mid = Number(missionId);
      console.log("[MissionManager] Calling createSession:", mid, sessionName);

      await createSession(mid, sessionName.trim(), gmNotes.trim());
      console.log("[MissionManager] createSession SUCCESS");

      setMissionId("");
      setSessionName("");
      setGmNotes("");
      refreshSessions();
    } catch (err) {
      console.error("[MissionManager] createSession ERROR:", err);
      setError("Create Session failed: " + err.message);
    }
  };

  // LOAD SESSION DETAILS
  async function loadSessionDetails(id) {
    try {
      setLoading(true);

      const session = await getSession(id);
      const players = await listSessionPlayers(id);
      const events = await listSessionEvents(id);
      const logs = await listSessionLogs(id);

      setSelectedSession({
        ...session,
        players,
        events,
        logs,
      });

      console.log("[MissionManager] Loaded session:", session);
    } catch (e) {
      console.error("loadSessionDetails ERROR:", e);
      setError("Failed to load session details.");
    } finally {
      setLoading(false);
    }
  }

  // MIN UTILITY: Prevent negative inputs
  function enforceMinPositive(val, setter) {
    const num = Number(val);
    if (num >= 1) setter(String(num));
  }

  return (
    <div style={{ padding: "1rem", color: "var(--lw-green)" }}>
      <h1 className="lw-panel-title">MISSION MANAGER</h1>

      {/* -------------------- ADMIN KEY FORM -------------------- */}
      {!adminEntered && (
        <form
          onSubmit={handleAdminKeySubmit}
          style={{
            marginTop: "1rem",
            background: "black",
            padding: "1rem",
            border: "1px solid var(--lw-green-dim)",
          }}
        >
          <h2 style={{ marginBottom: "0.5rem" }}>ENTER ADMIN KEY</h2>

          <input
            type="password"
            placeholder="Admin Key"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            style={inputStyle}
          />

          <button
            type="submit"
            className="lw-btn"
            style={{ marginTop: "0.5rem", width: "100%" }}
          >
            UNLOCK CONSOLE
          </button>

          {error && (
            <div style={{ color: "var(--lw-red)", marginTop: "0.5rem" }}>
              {error}
            </div>
          )}
        </form>
      )}

      {/* -------------------- MAIN CONSOLE -------------------- */}
      {adminEntered && (
        <>
          {/* CREATE NEW SESSION */}
          <div
            style={{
              background: "black",
              border: "1px solid var(--lw-green-dim)",
              padding: "1rem",
              marginTop: "1rem",
            }}
          >
            <h2 className="lw-panel-title">CREATE NEW RUN</h2>

            <form onSubmit={handleCreateSession}>
              <label>Mission ID</label>
              <input
                type="number"
                min={1}
                value={missionId}
                onChange={(e) =>
                  enforceMinPositive(e.target.value, setMissionId)
                }
                style={inputStyle}
              />

              <label style={{ marginTop: "0.5rem" }}>Session Name</label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                style={inputStyle}
              />

              <label style={{ marginTop: "0.5rem" }}>GM Notes</label>
              <textarea
                value={gmNotes}
                onChange={(e) => setGmNotes(e.target.value)}
                style={{ ...inputStyle, height: "80px" }}
              />

              <button
                type="submit"
                className="lw-btn"
                style={{ marginTop: "0.5rem", width: "100%" }}
              >
                CREATE
              </button>

              {error && (
                <div style={{ color: "var(--lw-red)", marginTop: "0.5rem" }}>
                  {error}
                </div>
              )}
            </form>
          </div>

          {/* SESSION LIST */}
          <div
            style={{
              background: "black",
              border: "1px solid var(--lw-green-dim)",
              padding: "1rem",
              marginTop: "1rem",
            }}
          >
            <h2 className="lw-panel-title">ACTIVE & RECENT SESSIONS</h2>

            {loading && <div>Loading…</div>}

            <div className="lw-session-list">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="lw-session-row"
                  onClick={() => loadSessionDetails(s.id)}
                >
                  <div>#{s.id}</div>
                  <div>{s.session_name}</div>
                  <div>{s.status}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SESSION DETAILS */}
          {selectedSession && (
            <div
              style={{
                background: "black",
                border: "1px solid var(--lw-green-dim)",
                padding: "1rem",
                marginTop: "1rem",
              }}
            >
              <h2 className="lw-panel-title">
                SESSION #{selectedSession.id}: {selectedSession.session_name}
              </h2>

              {/* TABS */}
              <div
                style={{
                  display: "flex",
                  gap: "0.3rem",
                  marginBottom: "0.5rem",
                }}
              >
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

              {/* TAB CONTENT TARGETS */}
              {tab === "players" && (
                <PlayerTab session={selectedSession} reload={loadSessionDetails} />
              )}

              {tab === "events" && (
                <EventsTab session={selectedSession} />
              )}

              {tab === "logs" && (
                <LogsTab session={selectedSession} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- TABS (Placeholders If Needed) ---------------- */

function PlayerTab({ session, reload }) {
  return (
    <div style={{ fontSize: "0.8rem" }}>
      <pre>{JSON.stringify(session.players, null, 2)}</pre>
    </div>
  );
}

function EventsTab({ session }) {
  return (
    <div style={{ fontSize: "0.8rem" }}>
      <pre>{JSON.stringify(session.events, null, 2)}</pre>
    </div>
  );
}

function LogsTab({ session }) {
  return (
    <div style={{ fontSize: "0.8rem" }}>
      <pre>{JSON.stringify(session.logs, null, 2)}</pre>
    </div>
  );
}
