"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./gm-dashboard.css";

export default function GMDashboardPage() {
  const router = useRouter();

  const [campaigns, setCampaigns] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const [events, setEvents] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);

  const [expandAll, setExpandAll] = useState(null);
  const [loading, setLoading] = useState(false);

  const LAST_CAMPAIGN_KEY = "gm:lastCampaign";
  const LAST_SESSION_KEY = "gm:lastSession";

  /* ---------------- Load Campaigns ---------------- */

  useEffect(() => {
    fetch("/api/campaigns")
      .then(r => r.json())
      .then(data => {
        setCampaigns(data);
        const saved = localStorage.getItem(LAST_CAMPAIGN_KEY);
        const found = data.find(c => c.id === saved);
        if (found) setSelectedCampaign(found);
        else if (data.length) setSelectedCampaign(data[0]);
      });
  }, []);

  /* ---------------- Load Sessions ---------------- */

  useEffect(() => {
    if (!selectedCampaign) return;

    fetch(`/api/sessions?campaign_id=${selectedCampaign.id}`)
      .then(r => r.json())
      .then(data => {
        setSessions(data);
        const saved = localStorage.getItem(LAST_SESSION_KEY);
        const found = data.find(s => s.id === saved);
        if (found) setSelectedSession(found);
        else if (data.length) setSelectedSession(data[0]);
      });
  }, [selectedCampaign]);

  /* ---------------- Load Content ---------------- */

useEffect(() => {
  if (!selectedSession || !selectedCampaign) return;

  setLoading(true);

  Promise.all([
    fetch(`/api/events?campaign_id=${selectedCampaign.id}&session_id=${selectedSession.id}`)
    fetch(`/api/npcs?session_id=${selectedSession.id}`).then(r => r.json()),
    fetch(`/api/encounters?campaign_id=${selectedCampaign.id}`)
    fetch(`/api/locations?campaign_id=${selectedCampaign.id}`).then(r => r.json()),
    fetch(`/api/items?campaign_id=${selectedCampaign.id}`).then(r => r.json())
  ])
    .then(([events, npcs, encounters, locations, items]) => {
      setEvents(events || []);
      setNpcs(npcs || []);
      setEncounters(encounters || []);
      setLocations(locations || []);
      setItems(items || []);
    })
    .finally(() => setLoading(false));
}, [selectedSession, selectedCampaign]);

  return (
    <div className="gm-page">
      <div className="gm-toolbar">
        <select
          value={selectedCampaign?.id || ""}
          onChange={(e) => {
            const c = campaigns.find(c => c.id === e.target.value);
            setSelectedCampaign(c);
            localStorage.setItem(LAST_CAMPAIGN_KEY, c?.id ?? "");
          }}
        >
          <option value="">Select Campaign</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedSession?.id || ""}
          onChange={(e) => {
            const s = sessions.find(s => s.id === e.target.value);
            setSelectedSession(s);
            localStorage.setItem(LAST_SESSION_KEY, s?.id ?? "");
          }}
        >
          <option value="">Select Session</option>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <div className="gm-toolbar-actions">
          <button onClick={() => setExpandAll(true)}>Expand All</button>
          <button onClick={() => setExpandAll(false)}>Collapse All</button>
        </div>
      </div>

      {loading && (
        <div className="gm-loading-overlay">
          <div className="gm-spinner" />
          <div className="gm-loading-text">Loading session data…</div>
        </div>
      )}

      <div className="gm-grid">
        <GMColumn title="Events" color="red" items={events} expandAll={expandAll} />
        <GMColumn title="NPCs" color="blue" items={npcs} expandAll={expandAll} />
        <GMColumn title="Encounters" color="green" items={encounters} expandAll={expandAll} />
        <GMColumn title="Locations" color="purple" items={locations} expandAll={expandAll} />
        <GMColumn title="Items" color="orange" items={items} expandAll={expandAll} />
      </div>
    </div>
  );
}

/* ---------------- Column ---------------- */

function GMColumn({ title, items, expandAll, color }) {
  const [order, setOrder] = useState([]);

  useEffect(() => {
    setOrder(items);
  }, [items]);

  return (
    <div className={`gm-column gm-${color}`}>
      <div className="gm-column-header">{title}</div>
      <div className="gm-column-body">
        {order.map(item => (
          <GMCard key={item.id} item={item} expandAll={expandAll} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Card ---------------- */

function GMCard({ item, expandAll }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof expandAll === "boolean") setOpen(expandAll);
  }, [expandAll]);

  return (
    <div className={`gm-card ${open ? "is-open" : ""}`}>
      <div className="gm-card-header" onClick={() => setOpen(!open)}>
        <span>{item.name || "Untitled"}</span>
        <span>{open ? "−" : "+"}</span>
      </div>

      <div className="gm-card-body-wrapper" style={{ maxHeight: open ? "1000px" : "0px" }}>
        <div className="gm-card-body">
          <pre>{JSON.stringify(item, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
