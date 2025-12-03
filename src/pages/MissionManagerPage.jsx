import React, { useState, useEffect } from "react";
import {
  listCampaigns,
  listSessions,
  createSession,
  listSessionPlayers,
  addSessionPlayer,
  removeSessionPlayer,
  archiveSessionEvent,
  listSessionMessages,
  listNPCs,
  getNPCState,
} from "../lib/mission-api";

// *** REQUIRED CSS IMPORT ***
import "./mission-manager.css";

export default function MissionManagerPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [npcList, setNpcList] = useState([]);
  const [npcState, setNpcState] = useState(null);

  const [newSessionName, setNewSessionName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");

  useEffect(() => {
    async function loadCampaigns() {
      const data = await listCampaigns();
      setCampaigns(data);
    }
    loadCampaigns();
  }, []);

  async function handleSelectCampaign(c) {
    setSelectedCampaign(c);
    setSelectedSession(null);
    setPlayers([]);
    setMessages([]);

    const s = await listSessions(c.id);
    setSessions(s);
  }

  async function handleSelectSession(s) {
    setSelectedSession(s);

    const p = await listSessionPlayers(s.id);
    setPlayers(p);

    const m = await listSessionMessages(s.id);
    setMessages(m);

    const n = await listNPCs();
    setNpcList(n);
    setNpcState(null);
  }

  async function handleCreateSession() {
    if (!newSessionName.trim() || !selectedCampaign) return;

    await createSession({
      campaign_id: selectedCampaign.id,
      session_name: newSessionName,
    });

    const updatedSessions = await listSessions(selectedCampaign.id);
    setSessions(updatedSessions);
    setNewSessionName("");
  }

  async function handleAddPlayer() {
    if (!newPlayerNumber.trim() || !selectedSession) return;
    await addSessionPlayer(selectedSession.id, newPlayerNumber);

    const p = await listSessionPlayers(selectedSession.id);
    setPlayers(p);
    setNewPlayerNumber("");
  }

  async function handleRemovePlayer(phone) {
    if (!selectedSession) return;

    await removeSessionPlayer(selectedSession.id, phone);

    const p = await listSessionPlayers(selectedSession.id);
    setPlayers(p);
  }

  async function handleSelectNPC(npc) {
    const state = await getNPCState(selectedSession.id, npc.id);
    setNpcState(state);
  }

  async function handleArchiveEvent(eventId) {
    await archiveSessionEvent(selectedSession.id, eventId);

    const m = await listSessionMessages(selectedSession.id);
    setMessages(m);
  }

  return (
    <div className="mission-manager">
      <h2>Mission Manager</h2>

      <div className="panel">
        <h3>Campaigns</h3>
        {campaigns.map((c) => (
          <div
            key={c.id}
            className={`item ${selectedCampaign?.id === c.id ? "selected" : ""}`}
            onClick={() => handleSelectCampaign(c)}
          >
            {c.name}
          </div>
        ))}
      </div>

      {selectedCampaign && (
        <div className="panel">
          <h3>Sessions</h3>
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`item ${selectedSession?.id === s.id ? "selected" : ""}`}
              onClick={() => handleSelectSession(s)}
            >
              {s.session_name}
            </div>
          ))}

          <input
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="New Session Name"
          />
          <button onClick={handleCreateSession}>Create Session</button>
        </div>
      )}

      {selectedSession && (
        <div className="panel">
          <h3>Players</h3>

          {players.length === 0 && <div>No players yet.</div>}
          {players.length > 0 &&
            players.map((p) => (
              <div key={p.phone_number} className="item">
                {p.phone_number}
                <button onClick={() => handleRemovePlayer(p.phone_number)}>Remove</button>
              </div>
            ))}

          <input
            value={newPlayerNumber}
            onChange={(e) => setNewPlayerNumber(e.target.value)}
            placeholder="Phone Number"
          />
          <button onClick={handleAddPlayer}>Add Player</button>
        </div>
      )}

      {selectedSession && (
        <div className="panel">
          <h3>Messages</h3>
          {messages.map((m, i) => (
            <div key={i} className="item">
              [{m.timestamp}] {m.text}
            </div>
          ))}
        </div>
      )}

      {selectedSession && (
        <div className="panel">
          <h3>NPCs</h3>
          {npcList.map((n) => (
            <div key={n.id} className="item" onClick={() => handleSelectNPC(n)}>
              {n.display_name}
            </div>
          ))}

          {npcState && (
            <div className="npc-state">
              <h4>NPC State</h4>
              <pre>{JSON.stringify(npcState, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
