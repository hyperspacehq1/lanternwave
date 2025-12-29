"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  /* ------------------ Data loading ------------------ */

  useEffect(() => {
    fetch("/api/campaigns")
      .then(r => r.json())
      .then(setCampaigns);
  }, []);

  useEffect(() => {
    if (!selectedCampaign) return;

    fetch(`/api/sessions?campaign_id=${selectedCampaign.id}`)
      .then(r => r.json())
      .then(setSessions);
  }, [selectedCampaign]);

  useEffect(() => {
    if (!selectedSession) return;

    Promise.all([
      fetch(`/api/events?session_id=${selectedSession.id}`).then(r => r.json()),
      fetch(`/api/npcs?session_id=${selectedSession.id}`).then(r => r.json()),
      fetch(`/api/encounters?session_id=${selectedSession.id}`).then(r => r.json()),
      fetch(`/api/locations?session_id=${selectedSession.id}`).then(r => r.json()),
      fetch(`/api/items?session_id=${selectedSession.id}`).then(r => r.json()),
    ]).then(([events, npcs, encounters, locations, items]) => {
      setEvents(events || []);
      setNpcs(npcs || []);
      setEncounters(encounters || []);
      setLocations(locations || []);
      setItems(items || []);
    });
  }, [selectedSession]);

  return (
    <div className="gm-page">
      <div className="gm-toolbar">
        <select
          value={selectedCampaign?.id || ""}
          onChange={(e) =>
            setSelectedCampaign(
              campaigns.find(c => c.id === e.target.value)
            )
          }
        >
          <option value="">Select Campaign</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedSession?.id || ""}
          onChange={(e) =>
            setSelectedSession(
              sessions.find(s => s.id === e.target.value)
            )
          }
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

function GMColumn({ title, items, expandAll }) {
  const [order, setOrder] = useState([]);
  const dragIndex = useRef(null);

  useEffect(() => {
    setOrder(items);
  }, [items]);

  const onDragStart = (e, index) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
  };

  const onDragLeave = (e) => {
    e.currentTarget.classList.remove("drag-over");
  };

  const onDrop = (e, index) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");

    const from = dragIndex.current;
    if (from === null || from === index) return;

    const updated = [...order];
    const [moved] = updated.splice(from, 1);
    updated.splice(index, 0, moved);
    setOrder(updated);
  };

  return (
    <div className="gm-column">
      <div className="gm-column-header">{title}</div>

      <div className="gm-column-body">
        {order.map((item, index) => (
          <div
            key={item.id}
            className="gm-drag-wrapper"
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, index)}
          >
            <GMCard item={item} expandAll={expandAll} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Card ---------------- */

function GMCard({ item, expandAll }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (typeof expandAll === "boolean") setOpen(expandAll);
  }, [expandAll]);

  return (
    <div className={`gm-card ${open ? "is-open" : ""}`}>
      <div
        className="gm-card-header"
        onClick={() => setOpen(!open)}
        role="button"
        tabIndex={0}
      >
        <span>{item.name || "Untitled"}</span>
        <span>{open ? "−" : "+"}</span>
      </div>

      <div
        className="gm-card-body-wrapper"
        style={{
          maxHeight: open ? "1000px" : "0px",
          opacity: open ? 1 : 0,
        }}
      >
        <div className="gm-card-body">
          <pre>{JSON.stringify(item, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
