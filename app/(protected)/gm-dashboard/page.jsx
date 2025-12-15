"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [campaigns] = useState([]); // intentionally empty
  const [activeSession, setActiveSession] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
     FUTURE DASHBOARD (disabled)
     ----------------------------- */
  return (
    <div className="gm-root">
      <aside className="gm-sidebar">
        <h1 className="gm-title">GM Dashboard</h1>
        <SearchBar
          npcs={[]}
          lore={[]}
          items={[]}
          locations={[]}
        />
      </aside>

      <main className="gm-main">
        <Timeline
          sessions={[]}
          events={[]}
          onSelectSession={setActiveSession}
        />
      </main>

      <section className="gm-detail">
        <div className="gm-detail-empty">
          Select a session or event.
        </div>
      </section>
    </div>
  );
}
