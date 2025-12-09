"use client";

import React, { useEffect, useState } from "react";
import { cmApi } from "@/lib/cm/client";
import Timeline from "@/components/gm/Timeline";
import RelationshipGraph from "@/components/gm/RelationshipGraph";
import MapViewer from "@/components/gm/MapViewer";
import SearchBar from "@/components/gm/SearchBar";
import SessionPanel from "@/components/gm/SessionPanel";
import Tools from "@/components/gm/Tools";

import "./gm-dashboard.css";

export default function GMDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [events, setEvents] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [lore, setLore] = useState([]);
  const [items, setItems] = useState([]);
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    async function load() {
      setCampaigns(await cmApi.list("campaigns"));
      setSessions(await cmApi.list("sessions"));
      setEvents(await cmApi.list("events"));
      setNpcs(await cmApi.list("npcs"));
      setLocations(await cmApi.list("locations"));
      setLore(await cmApi.list("lore"));
      setItems(await cmApi.list("items"));
    }
    load();
  }, []);

  return (
    <div className="gm-root">
      {/* LEFT SIDEBAR */}
      <aside className="gm-sidebar">
        <h1 className="gm-title">GM Dashboard</h1>

        <SearchBar npcs={npcs} lore={lore} items={items} locations={locations} />

        <div className="gm-menu">
          <button onClick={() => setActiveSession(null)}>Timeline</button>
          <button>Relationships</button>
          <button>Map</button>
          <button>Tools</button>
        </div>
      </aside>

      {/* CENTER PANEL */}
      <main className="gm-main">
        {!activeSession && (
          <Timeline
            sessions={sessions}
            events={events}
            onSelectSession={setActiveSession}
          />
        )}

        {/* relationship graph page */}
        {/* map viewer page */}
        {/* search results */}
        {/* tool subpanel */}
      </main>

      {/* RIGHT PANEL */}
      <section className="gm-detail">
        {activeSession ? (
          <SessionPanel
            session={activeSession}
            events={events.filter((e) => e.sessionId === activeSession.id)}
          />
        ) : (
          <div className="gm-detail-empty">
            Select a session or event.
          </div>
        )}
      </section>
    </div>
  );
}
