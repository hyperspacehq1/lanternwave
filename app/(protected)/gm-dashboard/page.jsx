"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./gm-dashboard.css";
import PlayerCharactersWidget from "@/components/widgets/PlayerCharactersWidget";
import { DISPLAY_SCHEMAS as BASE_SCHEMAS } from "@/lib/gm/displaySchemas";

/* =========================
   LocalStorage Keys
========================= */
const LS_LAST_CAMPAIGN = "gm:lastCampaignId";
const LS_LAST_SESSION_BY_CAMPAIGN_PREFIX = "gm:lastSessionId:";
const LS_ORDER_PREFIX = "gm-order:";
const LS_CARD_OPEN_PREFIX = "gm-card-open:";
const LS_OPEN_PANELS_PREFIX = "gm:open-panels:";

/* =========================
   Utils
========================= */
function asDate(v) {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

function mostRecentByCreatedAt(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const withDates = list
    .map((x) => ({ x, d: asDate(x?.created_at) }))
    .filter((r) => r.d);
  if (withDates.length === 0) return list[0] || null;
  withDates.sort((a, b) => b.d - a.d);
  return withDates[0].x || null;
}

/* =========================
   Record Rendering
========================= */
function renderValue(value, type) {
  if (value == null || value === "") return null;
  if (type === "json") return <pre className="gm-json">{JSON.stringify(value, null, 2)}</pre>;
  return <div className="gm-text">{String(value)}</div>;
}

function RecordView({ record, schema }) {
  if (!record || !schema) return null;
  return (
    <div className="gm-record">
      {schema.map(({ key, label, type }) => {
        const rendered = renderValue(record[key], type);
        if (!rendered) return null;
        return (
          <div key={key} className="gm-field">
            <div className="gm-field-label"><strong>{label}</strong></div>
            <div className="gm-field-value">{rendered}</div>
          </div>
        );
      })}
    </div>
  );
}

/* =========================
   Main Page
========================= */
export default function GMDashboardPage() {
  const router = useRouter();

  /* -------- Core State -------- */
  const [campaigns, setCampaigns] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const [events, setEvents] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(false);
  const [expandAll, setExpandAll] = useState(null);

  /* -------- Floating Panels -------- */
  const [openPanels, setOpenPanels] = useState([]);

  /* -------- Beacons -------- */
  const [beacons, setBeacons] = useState({});
  const showPlayersBeacon = !!beacons?.player_characters;

  /* -------- Schemas -------- */
  const DISPLAY_SCHEMAS = useMemo(() => ({
    ...BASE_SCHEMAS,
    events: [
      { key: "name", label: "Name" },
      { key: "description", label: "Description" },
      { key: "eventType", label: "Event Type" },
      { key: "priority", label: "Priority" },
    ],
    encounters: [
      { key: "name", label: "Name" },
      { key: "description", label: "Description" },
    ],
  }), []);

  /* =========================
     Floating Panel Helpers
  ========================= */
  const lookupRecord = (entityKey, id) => {
    const map = { events, npcs, encounters, locations, items };
    return map[entityKey]?.find(r => String(r.id) === String(id)) || null;
  };

  const openPanel = (entityKey, record, e) => {
    if (!record?.id) return;

    const clickX = e?.clientX ?? 160;
    const clickY = e?.clientY ?? 120;

    setOpenPanels(prev => {
      if (prev.some(p => String(p.id) === String(record.id))) return prev;
      const maxZ = Math.max(0, ...prev.map(p => p.z || 1));
      return [
        ...prev.map(p => ({ ...p, active: false })),
        {
          id: record.id,
          entityKey,
          record,
          width: 360,
          x: Math.max(16, clickX - 180),
          y: Math.max(16, clickY - 20),
          z: maxZ + 1,
          active: true,
        }
      ];
    });
  };

  /* =========================
     Persist Panels Per Session
  ========================= */
  useEffect(() => {
    if (!selectedSession?.id) return;
    try {
      localStorage.setItem(
        `${LS_OPEN_PANELS_PREFIX}${selectedSession.id}`,
        JSON.stringify(openPanels.map(({ id, entityKey, width, x, y, z }) => ({
          id, entityKey, width, x, y, z
        })))
      );
    } catch {}
  }, [openPanels, selectedSession?.id]);

  useEffect(() => {
    if (!selectedSession?.id) return;
    try {
      const raw = localStorage.getItem(`${LS_OPEN_PANELS_PREFIX}${selectedSession.id}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const restored = parsed
        .map(p => {
          const record = lookupRecord(p.entityKey, p.id);
          return record ? { ...p, record, active: false } : null;
        })
        .filter(Boolean);
      setOpenPanels(restored);
    } catch {}
  }, [selectedSession?.id, events, npcs, encounters, locations, items]);

  /* =========================
     Render
  ========================= */
  return (
    <div className="gm-page">
      {/* GRID + TOOLBAR UNCHANGED */}
      {/* ... everything above remains exactly as before ... */}

      {/* Floating Panels (NO DOCK) */}
      {openPanels.map(panel => (
        <FloatingPanel
          key={`${panel.entityKey}:${panel.id}`}
          panel={panel}
          schema={DISPLAY_SCHEMAS[panel.entityKey]}
          setPanels={setOpenPanels}
        />
      ))}

      {selectedCampaign?.id && showPlayersBeacon && (
        <PlayerCharactersWidget campaignId={selectedCampaign.id} />
      )}
    </div>
  );
}

/* =========================
   Floating Panel Window
========================= */
function FloatingPanel({ panel, schema, setPanels }) {
  const ref = useRef(null);
  const dragging = useRef(false);
  const offset = useRef({ dx: 0, dy: 0 });

  const focus = () => {
    setPanels(prev => {
      const maxZ = Math.max(0, ...prev.map(p => p.z || 1));
      return prev.map(p =>
        p.id === panel.id
          ? { ...p, z: maxZ + 1, active: true }
          : { ...p, active: false }
      );
    });
  };

  const snap = (x, y) => {
    const SNAP = 24;
    const w = panel.width;
    const h = 260;
    if (x < SNAP) x = 16;
    if (y < SNAP) y = 16;
    if (window.innerWidth - (x + w) < SNAP) x = window.innerWidth - w - 16;
    if (window.innerHeight - (y + h) < SNAP) y = window.innerHeight - h - 16;
    return { x, y };
  };

  return (
    <div
      ref={ref}
      className={`gm-floating-panel ${panel.active ? "is-active" : ""}`}
      style={{
        position: "fixed",
        left: panel.x,
        top: panel.y,
        width: panel.width,
        zIndex: panel.z,
      }}
      onMouseDown={focus}
    >
      <div
        className="gm-floating-header"
        onMouseDown={(e) => {
          focus();
          dragging.current = true;
          const r = ref.current.getBoundingClientRect();
          offset.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", up);
        }}
      >
        <span>{panel.record?.name || "Untitled"}</span>
        <button
          className="gm-card-action-btn"
          onClick={() => setPanels(prev => prev.filter(p => p.id !== panel.id))}
        >✕</button>
      </div>

      <div className="gm-floating-body">
        <RecordView record={panel.record} schema={schema} />
      </div>

      {/* Resize handle */}
      <div
        className="gm-panel-resize"
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = panel.width;
          const move = ev => {
            const delta = ev.clientX - startX;
            setPanels(prev =>
              prev.map(p =>
                p.id === panel.id
                  ? { ...p, width: Math.max(320, startWidth + delta) }
                  : p
              )
            );
          };
          const up = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", up);
        }}
      />
    </div>
  );

  function move(e) {
    if (!dragging.current) return;
    let x = e.clientX - offset.current.dx;
    let y = e.clientY - offset.current.dy;
    ({ x, y } = snap(x, y));
    setPanels(prev =>
      prev.map(p => p.id === panel.id ? { ...p, x, y } : p)
    );
  }

  function up() {
    dragging.current = false;
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
  }
}
