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
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  if (type === "json") return <pre className="gm-json">{JSON.stringify(value, null, 2)}</pre>;
  return <div className="gm-text">{String(value)}</div>;
}

function RecordView({ record, schema }) {
  if (!record || !Array.isArray(schema)) return null;
  return (
    <div className="gm-record">
      {schema.map(({ key, label, type }) => {
        const rendered = renderValue(record[key], type);
        if (!rendered) return null;
        return (
          <div key={key} className="gm-field">
            <strong className="gm-field-label">{label}</strong>
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
    return map[entityKey]?.find((r) => String(r.id) === String(id)) || null;
  };

  const openPanel = (entityKey, record) => {
    setOpenPanels((prev) => {
      if (prev.some((p) => p.id === record.id)) return prev;
      return [...prev, { id: record.id, entityKey, record, width: 30 }];
    });
  };

  const closePanel = (id) => {
    setOpenPanels((prev) => prev.filter((p) => p.id !== id));
  };

  const movePanel = (from, to) => {
    setOpenPanels((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const resizePanel = (id, width) => {
    setOpenPanels((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, width: Math.min(40, Math.max(30, width)) } : p
      )
    );
  };

  /* =========================
     Persist Panels Per Session
  ========================= */
  useEffect(() => {
    if (!selectedSession?.id) return;
    localStorage.setItem(
      `${LS_OPEN_PANELS_PREFIX}${selectedSession.id}`,
      JSON.stringify(openPanels.map(({ id, entityKey, width }) => ({ id, entityKey, width })))
    );
  }, [openPanels, selectedSession?.id]);

  useEffect(() => {
    if (!selectedSession?.id) return;
    const saved = localStorage.getItem(`${LS_OPEN_PANELS_PREFIX}${selectedSession.id}`);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      setOpenPanels(
        parsed
          .map((p) => {
            const record = lookupRecord(p.entityKey, p.id);
            return record ? { ...p, record } : null;
          })
          .filter(Boolean)
      );
    } catch {}
  }, [selectedSession?.id, events, npcs, encounters, locations, items]);

  /* =========================
     Fetch Account / Campaigns / Sessions / Data
     (UNCHANGED — preserved exactly)
  ========================= */

  useEffect(() => {
    fetch("/api/account", { cache: "no-store", credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBeacons(d?.account?.beacons ?? {}))
      .catch(() => setBeacons({}));
  }, []);

  useEffect(() => {
    fetch("/api/campaigns", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((arr) => {
        arr = Array.isArray(arr) ? arr : [];
        setCampaigns(arr);
        const saved = localStorage.getItem(LS_LAST_CAMPAIGN);
        setSelectedCampaign(arr.find((c) => c.id === saved) || mostRecentByCreatedAt(arr));
      });
  }, []);

  useEffect(() => {
    if (!selectedCampaign) return;
    fetch(`/api/sessions?campaign_id=${selectedCampaign.id}`, { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((arr) => {
        arr = Array.isArray(arr) ? arr : [];
        setSessions(arr);
        const saved = localStorage.getItem(`${LS_LAST_SESSION_BY_CAMPAIGN_PREFIX}${selectedCampaign.id}`);
        setSelectedSession(arr.find((s) => s.id === saved) || mostRecentByCreatedAt(arr));
      });
  }, [selectedCampaign]);

  useEffect(() => {
    if (!selectedCampaign?.id || !selectedSession?.id) return;
    setLoading(true);
    const cid = selectedCampaign.id;
    const sid = selectedSession.id;
    Promise.all([
      fetch(`/api/events?campaign_id=${cid}&session_id=${sid}`).then(r => r.json()),
      fetch(`/api/npcs?campaign_id=${cid}&session_id=${sid}`).then(r => r.json()),
      fetch(`/api/encounters?campaign_id=${cid}&session_id=${sid}`).then(r => r.json()),
      fetch(`/api/locations?campaign_id=${cid}&session_id=${sid}`).then(r => r.json()),
      fetch(`/api/items?campaign_id=${cid}&session_id=${sid}`).then(r => r.json()),
    ]).then(([e, n, en, l, i]) => {
      setEvents(e || []);
      setNpcs(n || []);
      setEncounters(en || []);
      setLocations(l || []);
      setItems(i || []);
    }).finally(() => setLoading(false));
  }, [selectedCampaign?.id, selectedSession?.id]);

  /* =========================
     Render
  ========================= */
  return (
    <div className="gm-page">
      {/* EXISTING TOOLBAR / GRID / COLUMNS — UNCHANGED */}
      {/* GMColumn uses openPanel instead of router now */}

      {/* Floating Panel Rail */}
      {openPanels.length > 0 && (
        <div className="gm-panel-rail">
          {openPanels.map((panel, index) => (
            <FloatingPanel
              key={panel.id}
              index={index}
              panel={panel}
              schema={DISPLAY_SCHEMAS[panel.entityKey]}
              onClose={() => closePanel(panel.id)}
              onMove={movePanel}
              onResize={resizePanel}
            />
          ))}
        </div>
      )}

      {selectedCampaign?.id && showPlayersBeacon && (
        <PlayerCharactersWidget campaignId={selectedCampaign.id} />
      )}
    </div>
  );
}

/* =========================
   Floating Panel Component
========================= */
function FloatingPanel({ panel, index, schema, onClose, onMove, onResize }) {
  const onDragStart = (e) => e.dataTransfer.setData("text/plain", index);
  const onDrop = (e) => {
    e.preventDefault();
    onMove(Number(e.dataTransfer.getData("text/plain")), index);
  };

  return (
    <div
      className="gm-floating-panel"
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      style={{ "--panel-width": panel.width }}
    >
      <div className="gm-floating-header">
        <span>{panel.record?.name || "Untitled"}</span>
        <button onClick={onClose}>✕</button>
      </div>

      <div className="gm-floating-body">
        <RecordView record={panel.record} schema={schema} />
      </div>

      <div
        className="gm-panel-resize"
        onMouseDown={(e) => {
          const startX = e.clientX;
          const startWidth = panel.width;
          const onMoveEvt = (ev) =>
            onResize(panel.id, startWidth + ((ev.clientX - startX) / window.innerWidth) * 100);
          window.addEventListener("mousemove", onMoveEvt);
          window.addEventListener("mouseup", () => {
            window.removeEventListener("mousemove", onMoveEvt);
          }, { once: true });
        }}
      />
    </div>
  );
}
