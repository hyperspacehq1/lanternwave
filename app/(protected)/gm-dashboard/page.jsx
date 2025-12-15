"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// import { cmApi } from "@/lib/cm/client";
import Timeline from "@/components/gm/Timeline";
import RelationshipGraph from "@/components/gm/RelationshipGraph";
import MapViewer from "@/components/gm/MapViewer";
import SearchBar from "@/components/gm/SearchBar";
import SessionPanel from "@/components/gm/SessionPanel";
import Tools from "@/components/gm/Tools";

import "./gm-dashboard.css";

/* ----------------------------------
   Create Campaign Modal
---------------------------------- */
function CreateCampaignModal({ onClose }) {
  const router = useRouter();

  return (
    <div className="gm-modal-backdrop">
      <div className="gm-modal">
        <h2>Create Your First Campaign</h2>

        <p>
          Campaigns are created and managed in the Campaign Manager.
          Once you create a campaign, it will appear here in your GM Dashboard.
        </p>

        <div className="gm-modal-actions">
          <button
            className="gm-primary"
            onClick={() => router.push("/campaign-manager")}
          >
            Go to Campaign Manager
          </button>

          <button className="gm-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GMDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [events, setEvents] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [lore, setLore] = useState([]);
  const [items, setItems] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const campaignsData = await cmApi.list("campaigns");
        setCampaigns(campaignsData);

        if (campaignsData.length > 0) {
          setSessions(await cmApi.list("sessions"));
          setEvents(await cmApi.list("events"));
          setNpcs(await cmApi.list("npcs"));
          setLocations(await cmApi.list("locations"));
          setLore(await cmApi.list("lore"));
          setItems(await cmApi.list("items"));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* -----------------------------
     Loading state
     ----------------------------- */
  if (loading) {
    return (
      <div className="gm-root gm-loading">
        Loading your dashboard…
      </div>
    );
  }

  /* -----------------------------
     FIRST-TIME WELCOME STATE
     ----------------------------- */
  if (campaigns.length === 0) {
    return (
      <div className="gm-root gm-welcome">
        <div className="gm-welcome-card">
          <h1>🎉 Welcome to LanternWave</h1>

          <p>Your account has been created successfully.</p>
          <p>
            To get started, you’ll need to create your first campaign.
          </p>

          <button
            className="gm-primary"
            onClick={() => setShowCreateModal(true)}
          >
            Create Your First Campaign
          </button>
        </div>

        {showCreateModal && (
          <CreateCampaignModal
            onClose={() => setShowCreateModal(false)}
          />
        )}
      </div>
    );
  }

  /* -----------------------------
     NORMAL DASHBOARD
     ----------------------------- */
  return (
    <div className="gm-root">
      {/* LEFT SIDEBAR */}
      <aside className="gm-sidebar">
        <h1 className="gm-title">GM Dashboard</h1>

        <SearchBar
          npcs={npcs}
          lore={lore}
          items={items}
          locations={locations}
        />

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
      </main>

      {/* RIGHT PANEL */}
      <section className="gm-detail">
        {activeSession ? (
          <SessionPanel
            session={activeSession}
            events={events.filter(
              (e) => e.sessionId === activeSession.id
            )}
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
