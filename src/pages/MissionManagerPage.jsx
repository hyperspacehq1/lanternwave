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

/* ============================================================
   PLAYER TAB — FULL UI
   ============================================================ */
function PlayerTab({ session, reload }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    setError("");
    if (!phone.trim()) {
      setError("Phone number required.");
      return;
    }
    try {
      setBusy(true);
      await addSessionPlayer(session.id, phone.trim(), name.trim());
      setPhone("");
      setName("");
      await reload(session.id);
    } catch (e) {
      console.error("addSessionPlayer ERROR:", e);
      setError("Failed to add player.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(phoneNumber) {
    try {
      setBusy(true);
      await removeSessionPlayer(session.id, phoneNumber);
      await reload(session.id);
    } catch (e) {
      console.error("removeSessionPlayer ERROR:", e);
      setError("Failed to remove player.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ fontSize: "0.8rem" }}>
      <h3 style={{ marginBottom: "0.5rem" }}>Players</h3>

      {/* ADD PLAYER */}
      <div
        style={{
          border: "1px solid var(--lw-green-dim)",
          padding: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <input
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Player Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ ...inputStyle, marginTop: "0.4rem" }}
        />

        <button
          className="lw-btn"
          style={{ marginTop: "0.5rem" }}
          disabled={busy}
          onClick={handleAdd}
        >
          ADD PLAYER
        </button>

        {error && (
          <div style={{ color: "var(--lw-red)", marginTop: "0.5rem" }}>
            {error}
          </div>
        )}
      </div>

      {/* PLAYER LIST */}
      {session.players.length === 0 && <div>No players yet.</div>}

      {session.players.length > 0 && (
        <div>
          {session.players.map((p) => (
            <div
              key={p.phone_number}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.3rem 0",
                borderBottom: "1px solid var(--lw-green-dim)",
              }}
            >
              <div>
                <div>{p.player_name || "(Unnamed)"}</div>
                <div style={{ opacity: 0.6 }}>{p.phone_number}</div>
              </div>

              <button
                className="lw-btn"
                onClick={() => handleRemove(p.phone_number)}
                disabled={busy}
              >
                REMOVE
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   EVENTS TAB — FULL UI
   ============================================================ */
function EventsTab({ session }) {
  if (!session.events) return null;

  return (
    <div style={{ fontSize: "0.8rem" }}>
      <h3 style={{ marginBottom: "0.5rem" }}>Mission Events</h3>

      {session.events.length === 0 && <div>No events recorded.</div>}

      {session.events.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.7rem",
          }}
        >
          {session.events.map((evt) => (
            <div
              key={evt.id}
              style={{
                border: "1px solid var(--lw-green-dim)",
                padding: "0.6rem",
                borderRadius: "6px",
                background: "rgba(20, 255, 50, 0.03)",
              }}
            >
              {/* Header */}
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: "0.25rem",
                  color: "var(--lw-green)",
                }}
              >
                {evt.event_type.toUpperCase()}
              </div>

              {/* Timestamp */}
              <div style={{ opacity: 0.7, marginBottom: "0.25rem" }}>
                {new Date(evt.created_at).toLocaleString()}
              </div>

              {/* Player phone (if applicable) */}
              {evt.phone_number && (
                <div style={{ opacity: 0.7, marginBottom: "0.25rem" }}>
                  From: {evt.phone_number}
                </div>
              )}

              {/* JSON payload */}
              <pre
                style={{
                  fontSize: "0.7rem",
                  whiteSpace: "pre-wrap",
                }}
              >
                {JSON.stringify(evt.payload, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   LOGS TAB — JSON VIEWER (keep simple)
   ============================================================ */
function LogsTab({ session }) {
  return (
    <div style={{ fontSize: "0.8rem" }}>
      <h3>Message Logs</h3>
      {session.logs.length === 0 && <div>No logs yet.</div>}

      {session.logs.length > 0 && (
        <pre style={{ fontSize: "0.75rem", whiteSpace: "pre-wrap" }}>
          {JSON.stringify(session.logs, null, 2)}
        </pre>
      )}
    </div>
  );
}
