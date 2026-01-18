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

async function pulseNpcClip({ npcId, durationMs }) {
  // 1. resolve NPC → clip key
  const clipRes = await fetch(`/api/npc-pulse?npc_id=${npcId}`, {
    credentials: "include",
  });
  if (!clipRes.ok) return;

  const { key } = await clipRes.json();
  if (!key) return;

  // 2. stash current now-playing
  const nowRes = await fetch("/api/r2/now-playing", {
    credentials: "include",
    cache: "no-store",
  });
  const nowData = nowRes.ok ? await nowRes.json() : null;
  const previousKey = nowData?.nowPlaying?.key ?? null;

  // 3. set NPC clip
  await fetch("/api/r2/now-playing", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });

  // 4. restore after duration
  setTimeout(async () => {
    await fetch("/api/r2/now-playing", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: previousKey }),
    });
  }, durationMs);
}


/* =========================
   Record Rendering (Field View)
========================= */
function renderValue(value, type) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;

  if (type === "json") {
    return <pre className="gm-json">{JSON.stringify(value, null, 2)}</pre>;
  }

  return <div className="gm-text">{String(value)}</div>;
}

function RecordView({ record, schema }) {
  if (!record || !Array.isArray(schema) || schema.length === 0) return null;

  return (
    <div className="gm-record">
      {schema.map(({ key, label, type }) => {
        const rendered = renderValue(record[key], type);
        if (!rendered) return null;

        return (
          <div key={key} className="gm-field">
            <div className="gm-field-label">
              <strong>{label}</strong>
            </div>
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

/* -------- Joined-record pulse state -------- */
const [joinHighlights, setJoinHighlights] = useState({});
const [fadingJoins, setFadingJoins] = useState({});

/* -------- Active join source (ownership) -------- */
const [activeJoinSource, setActiveJoinSource] = useState(null);
// shape: { entityKey, recordId } | null

/* -------- Floating Windows (overlay layer) -------- */
const [floatingWindows, setFloatingWindows] = useState([]);
const floatingHydratedRef = useRef(false);

  /* -------- Beacons -------- */
  const [beacons, setBeacons] = useState({});
 const showPlayersBeacon = !!beacons?.player_characters;
 const showNpcPulseBeacon = !!beacons?.npc_pulse;

  /* -------- Schemas -------- */
  const DISPLAY_SCHEMAS = useMemo(() => {
    return {
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
    };
  }, []);

  const canUseSession = !!selectedSession?.id;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const openPanel = (entityKey, record, e) => {
  if (!record?.id) return;

  // 1. Floating window at click position
  const clickX = e?.clientX ?? 160;
  const clickY = e?.clientY ?? 120;

  setFloatingWindows((prev) => {
    if (prev.some((w) => String(w.id) === String(record.id))) return prev;

    return [
      ...prev,
      {
        id: record.id,
        entityKey,
        record,
x: clamp(clickX - 180, 16, window.innerWidth - 360 - 16),
y: clamp(clickY - 20, 16, window.innerHeight - 240 - 16),
        width: 360,
        z: Date.now(),
      },
    ];
  });
};

/* =========================
   Resolve joined records
========================= */
async function resolveJoins(entityKey, recordId) {
  // Only these entities participate
  if (!["sessions", "encounters", "locations"].includes(entityKey)) return;

  try {
    const res = await fetch(
      `/api/gm/joins?entity=${entityKey}&id=${recordId}`,
      { credentials: "include" }
    );

    if (!res.ok) return;

    const data = await res.json();
setActiveJoinSource({ entityKey, recordId });

    setJoinHighlights((prev) => {
      const next = { ...prev };

      Object.entries(data.joined || {}).forEach(([k, ids]) => {
        next[k] = Array.isArray(ids) ? ids.map(String) : [];
      });

      return next;
    });
  } catch {
    // silent failure – no UI regression
  }
}

function clearJoins(source) {
  setActiveJoinSource((current) => {
    // If no active joins, nothing to clear
    if (!current) return current;

    // If a source is provided, only clear if it matches
    if (
      source &&
      (current.entityKey !== source.entityKey ||
        current.recordId !== source.recordId)
    ) {
      return current;
    }

    // ✅ This source owns the joins — clear them
   
// 🌫️ mark current joins as fading
setFadingJoins((prev) => ({ ...prev, ...joinHighlights }));

// clear active highlights immediately
setJoinHighlights({});

// remove fade markers after animation completes
setTimeout(() => {
  setFadingJoins({});
}, 650);


    return null;
  });
}

/* =========================
   Persist Floating Windows
========================= */
useEffect(() => {
  if (!selectedSession?.id) return;
  if (!floatingHydratedRef.current) return; // 👈 prevent first-mount overwrite

  try {
    localStorage.setItem(
      `gm:floating-windows:${selectedSession.id}`,
      JSON.stringify(
        floatingWindows.map(({ id, entityKey, x, y, width, z }) => ({
          id, entityKey, x, y, width, z,
        }))
      )
    );
  } catch {}
}, [floatingWindows, selectedSession?.id]);

  /* =========================
   Reset to Default (keep existing + add panels reset)
========================= */
const resetToDefault = () => {
  try {
    localStorage.removeItem(LS_LAST_CAMPAIGN);

    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith(LS_LAST_SESSION_BY_CAMPAIGN_PREFIX)) localStorage.removeItem(k);
      if (k.startsWith(LS_ORDER_PREFIX)) localStorage.removeItem(k);
      if (k.startsWith(LS_CARD_OPEN_PREFIX)) localStorage.removeItem(k);

      // 🆕 remove floating window layouts
      if (k.startsWith("gm:floating-windows:")) localStorage.removeItem(k);
    });
  } catch {}

  setSelectedCampaign(null);
  setSelectedSession(null);
  setSessions([]);
  setEvents([]);
  setNpcs([]);
  setEncounters([]);
  setLocations([]);
  setItems([]);
  setExpandAll(null);

  // 🆕 close all floating record windows immediately
  setFloatingWindows([]);
};

/* =========================
   Restore Floating Windows
========================= */
useEffect(() => {
  if (!selectedSession?.id) return;

const allRecords = [
  ...events,
  ...npcs,
  ...encounters,
  ...locations,
  ...items,
];

if (allRecords.length === 0) return;

  try {
    const raw = localStorage.getItem(`gm:floating-windows:${selectedSession.id}`);
    if (!raw) return;

    const saved = JSON.parse(raw);

    const restored = saved
      .map((w) => {
        const record =
          events.find(r => r.id === w.id) ||
          npcs.find(r => r.id === w.id) ||
          encounters.find(r => r.id === w.id) ||
          locations.find(r => r.id === w.id) ||
          items.find(r => r.id === w.id);

        return record
      ? {
          ...w,
          record,
          z: typeof w.z === "number" ? w.z : Date.now(), // 👈 preserve z
        }
      : null;
      })
      .filter(Boolean);

    setFloatingWindows(restored);
    floatingHydratedRef.current = true;
  } catch {}
}, [
  selectedSession?.id,
  events,
  npcs,
  encounters,
  locations,
  items,
]);

  /* =========================
     Account / Beacons
  ========================= */
  useEffect(() => {
    fetch("/api/account", { cache: "no-store", credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBeacons(d?.account?.beacons ?? {}))
      .catch(() => setBeacons({}));
  }, []);

  /* =========================
     Campaigns
  ========================= */
  useEffect(() => {
    fetch("/api/campaigns", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((arr) => {
        arr = Array.isArray(arr) ? arr : [];
        setCampaigns(arr);

        let next = null;
        try {
          const saved = localStorage.getItem(LS_LAST_CAMPAIGN);
          if (saved) next = arr.find((c) => c.id === saved) || null;
        } catch {}

        if (!next) next = mostRecentByCreatedAt(arr);
        if (next) setSelectedCampaign(next);
      })
      .catch(() => setCampaigns([]));
  }, []);

  useEffect(() => {
    if (!selectedCampaign?.id) return;
    try {
      localStorage.setItem(LS_LAST_CAMPAIGN, selectedCampaign.id);
    } catch {}
  }, [selectedCampaign?.id]);

  /* =========================
     Sessions
  ========================= */
  useEffect(() => {
    if (!selectedCampaign) return;

    setSelectedSession(null);
    setEvents([]);
    setNpcs([]);
    setEncounters([]);
    setLocations([]);
    setItems([]);
    setExpandAll(null);

    fetch(`/api/sessions?campaign_id=${selectedCampaign.id}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((arr) => {
        arr = Array.isArray(arr) ? arr : [];
        setSessions(arr);

        let next = null;
        try {
          const saved = localStorage.getItem(
            `${LS_LAST_SESSION_BY_CAMPAIGN_PREFIX}${selectedCampaign.id}`
          );
          if (saved) next = arr.find((s) => s.id === saved) || null;
        } catch {}

        if (!next) next = mostRecentByCreatedAt(arr);
        if (next) setSelectedSession(next);
      })
      .catch(() => setSessions([]));
  }, [selectedCampaign]);

  useEffect(() => {
    if (!selectedCampaign?.id || !selectedSession?.id) return;
    try {
      localStorage.setItem(
        `${LS_LAST_SESSION_BY_CAMPAIGN_PREFIX}${selectedCampaign.id}`,
        selectedSession.id
      );
    } catch {}
  }, [selectedCampaign?.id, selectedSession?.id]);

  /* =========================
     Load Data (fixed params)
  ========================= */
  useEffect(() => {
    if (!selectedCampaign?.id || !selectedSession?.id) return;

    setLoading(true);

    const campaign_id = selectedCampaign.id;
    const session_id = selectedSession.id;

    Promise.all([
      fetch(`/api/events?campaign_id=${campaign_id}&session_id=${session_id}`, {
        credentials: "include",
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(`/api/npcs?campaign_id=${campaign_id}&session_id=${session_id}`, {
        credentials: "include",
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(`/api/encounters?campaign_id=${campaign_id}&session_id=${session_id}`, {
        credentials: "include",
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(`/api/locations?campaign_id=${campaign_id}&session_id=${session_id}`, {
        credentials: "include",
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(`/api/items?campaign_id=${campaign_id}&session_id=${session_id}`, {
        credentials: "include",
        cache: "no-store",
      }).then((r) => r.json()),
    ])


  .then(([eventsRes, npcsRes, encountersRes, locationsRes, itemsRes]) => {
  const applyOrder = (entityKey, rows) => {
  if (!selectedSession?.id) return rows;

  try {
    const key = `gm-order:${selectedCampaign.id}:${entityKey}`;
    const raw = localStorage.getItem(key);
    if (!raw) return rows;

    // ✅ normalize everything to strings
    const idsRaw = JSON.parse(raw);
    const ids = Array.isArray(idsRaw) ? idsRaw.map((v) => String(v)) : [];
    const idSet = new Set(ids);

    const byId = new Map(rows.map((r) => [String(r.id), r]));
    const ordered = [];

    for (const id of ids) {
      const row = byId.get(id);
      if (row) ordered.push(row);
    }

    for (const row of rows) {
      if (!idSet.has(String(row.id))) ordered.push(row);
    }

    return ordered;
  } catch {
    return rows;
  }
};

  setEvents(applyOrder("events", Array.isArray(eventsRes) ? eventsRes : []));
  setNpcs(applyOrder("npcs", Array.isArray(npcsRes) ? npcsRes : []));
  setEncounters(applyOrder("encounters", Array.isArray(encountersRes) ? encountersRes : []));
  setLocations(applyOrder("locations", Array.isArray(locationsRes) ? locationsRes : []));
  setItems(applyOrder("items", Array.isArray(itemsRes) ? itemsRes : []));
})

      .catch(() => {
        setEvents([]);
        setNpcs([]);
        setEncounters([]);
        setLocations([]);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [selectedCampaign?.id, selectedSession?.id]);

  /* =========================
     Future-safe full-page editor path (pop-out later)
  ========================= */
  const editorPathFor = (entityKey, id) => {
    const map = {
      events: "events",
      npcs: "npcs",
      locations: "locations",
      encounters: "encounters",
      items: "items",
    };
    const base = map[entityKey];
    return base ? `/${base}/${id}` : null;
  };

  /* =========================
     Render
  ========================= */
  return (
    <div className="gm-page">
      {/* ---------------- Toolbar (restored left/right layout) ---------------- */}
      <div className="gm-toolbar" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Left group: selects */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <select
            value={selectedCampaign?.id || ""}
            onChange={(e) => {
              const next = campaigns.find((c) => c.id === e.target.value) || null;
              setSelectedCampaign(next);
            }}
          >
            <option value="">Select Campaign</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSession?.id || ""}
            disabled={!selectedCampaign}
            onChange={(e) => {
              const next = sessions.find((s) => s.id === e.target.value) || null;
              setSelectedSession(next);
            }}
          >
            <option value="">Select Session</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right group: actions */}
<div
  className="gm-toolbar-actions"
  style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}
>
  <button
    type="button"
    className="gm-toolbar-btn"
    onClick={() => setExpandAll(true)}
    disabled={!canUseSession}
  >
    Expand All
  </button>

  <button
    type="button"
    className="gm-toolbar-btn"
    onClick={() => setExpandAll(false)}
    disabled={!canUseSession}
  >
    Collapse All
  </button>

  <button
    type="button"
    className="gm-toolbar-btn"
    onClick={resetToDefault}
  >
    Reset to Default
  </button>

  <a
    href="/account"
    className="gm-toolbar-btn gm-toolbar-btn-beacons"
  >
  Activate Beacons
  </a>
</div>
</div> 

      {!selectedCampaign && <div className="gm-empty">Select or create a campaign to begin.</div>}
      {selectedCampaign && !selectedSession && <div className="gm-empty">Select or create a session.</div>}

      {selectedCampaign && selectedSession && (
  <div className="gm-grid">
    <GMColumn
  title="Events"
  color="red"
  entityKey="events"
  items={events}
  joinHighlights={joinHighlights}
  resolveJoins={resolveJoins}
  clearJoins={clearJoins}
fadingJoins={fadingJoins}
  forceOpen={expandAll}
  campaignId={selectedCampaign.id}
  sessionId={selectedSession.id}
  schema={DISPLAY_SCHEMAS.events}
  onOpenPanel={openPanel}
  onOpenEditor={(id) => router.push(editorPathFor("events", id))}
/>

   <GMColumn
  title="NPCs"
  color="blue"
  entityKey="npcs"
  items={npcs}
  joinHighlights={joinHighlights}
  resolveJoins={resolveJoins}
  clearJoins={clearJoins}
fadingJoins={fadingJoins}
  forceOpen={expandAll}
  campaignId={selectedCampaign.id}
  sessionId={selectedSession.id}
  schema={DISPLAY_SCHEMAS.npcs}
  showNpcPulseBeacon
  onOpenPanel={openPanel}
  onOpenEditor={(id) => router.push(editorPathFor("npcs", id))}
/>
    <GMColumn
  title="Encounters"
  color="green"
  entityKey="encounters"
  items={encounters}
  joinHighlights={joinHighlights}
  resolveJoins={resolveJoins}
  clearJoins={clearJoins}
fadingJoins={fadingJoins}
  forceOpen={expandAll}
  campaignId={selectedCampaign.id}
  sessionId={selectedSession.id}
  schema={DISPLAY_SCHEMAS.encounters}
  onOpenPanel={openPanel}
  onOpenEditor={(id) => router.push(editorPathFor("encounters", id))}
/>

    <GMColumn
  title="Locations"
  color="purple"
  entityKey="locations"
  items={locations}
  joinHighlights={joinHighlights}
  resolveJoins={resolveJoins}
  clearJoins={clearJoins}
fadingJoins={fadingJoins}
  forceOpen={expandAll}
  campaignId={selectedCampaign.id}
  sessionId={selectedSession.id}
  schema={DISPLAY_SCHEMAS.locations}
  onOpenPanel={openPanel}
  onOpenEditor={(id) => router.push(editorPathFor("locations", id))}
/>

    <GMColumn
  title="Items"
  color="orange"
  entityKey="items"
  items={items}
  joinHighlights={joinHighlights}
  resolveJoins={resolveJoins}
  clearJoins={clearJoins}
fadingJoins={fadingJoins}
  forceOpen={expandAll}
  campaignId={selectedCampaign.id}
  sessionId={selectedSession.id}
  schema={DISPLAY_SCHEMAS.items}
  onOpenPanel={openPanel}
  onOpenEditor={(id) => router.push(editorPathFor("items", id))}
/>
  </div>
)}

      {loading && <div className="gm-loading">Loading…</div>}

{/* Floating record windows (overlay) */}
{floatingWindows.map((win) => (
  <FloatingWindow
    key={`fw-${win.entityKey}-${win.id}`}
    win={win}
    schema={DISPLAY_SCHEMAS[win.entityKey]}
    clearJoins={clearJoins}
    onClose={() =>
      setFloatingWindows((prev) => prev.filter((w) => w.id !== win.id))
    }
    onMove={(id, x, y, bringToFront = false) =>
      setFloatingWindows((prev) => {
        const maxZ = Math.max(0, ...prev.map(w => w.z || 0));
        return prev.map((w) =>
          w.id === id
            ? { ...w, x, y, z: bringToFront ? maxZ + 1 : w.z }
            : w
        );
      })
    }
    onResize={(id, width) =>
      setFloatingWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, width } : w))
      )
    }
  />
))}

      {/* Beacon-controlled widget */}
      {selectedCampaign?.id && showPlayersBeacon && <PlayerCharactersWidget campaignId={selectedCampaign.id} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Column Component (drag reorder + persistence) */
/* ------------------------------------------------------------------ */

function GMColumn({
  title,
  color,
  entityKey,
  items,
  campaignId,
  forceOpen,
  sessionId,
  onOpenEditor,
  onOpenPanel,
  schema,
  showNpcPulseBeacon,
  joinHighlights,
  fadingJoins,          // ✅ ADD THIS
  resolveJoins,
  clearJoins,
}) {

  const stableStorageKeyRef = useRef(null);
  const hydratedRef = useRef(false);
  const [order, setOrder] = useState([]);
  const draggingIndexRef = useRef(null);

const storageKey = useMemo(() => {
  if (!campaignId) return null;
  return `${LS_ORDER_PREFIX}${campaignId}:${entityKey}`;
}, [campaignId, entityKey]);

 useEffect(() => {
  // ✅ LOCK the storage key as soon as it exists
  if (storageKey && !stableStorageKeyRef.current) {
    stableStorageKeyRef.current = storageKey;
  }

  hydratedRef.current = false;

  if (!Array.isArray(items)) {
    setOrder([]);
    hydratedRef.current = true;
    return;
  }

  if (!storageKey) {
    setOrder(items);
    hydratedRef.current = true;
    return;
  }

  let saved = null;
  try {
    saved = localStorage.getItem(storageKey);
  } catch {
    saved = null;
  }

  if (!saved) {
    setOrder(items);
    hydratedRef.current = true;
    return;
  }

  let savedIds = [];
  try {
    savedIds = JSON.parse(saved);
  } catch {
    savedIds = [];
  }

  savedIds = Array.isArray(savedIds) ? savedIds.map((v) => String(v)) : [];

  const byId = new Map(items.map((it) => [String(it.id), it]));
  const ordered = [];

  for (const id of savedIds) {
    const row = byId.get(String(id));
    if (row) ordered.push(row);
  }

  for (const it of items) {
    if (!savedIds.includes(String(it.id))) ordered.push(it);
  }

  setOrder(ordered);
  hydratedRef.current = true;
}, [items, storageKey]);

const didUserReorderRef = useRef(false);

useEffect(() => {
  if (!storageKey) return;
  if (!hydratedRef.current) return;
  if (!didUserReorderRef.current) return; // 🔥 CRITICAL

  try {
    const ids = order.map((it) => String(it.id));
    localStorage.setItem(storageKey, JSON.stringify(ids));
  } catch {}
}, [order, storageKey]);

  const onDragStart = (e, index) => {
    const t = e.target;
    if (t && (t.closest?.("button") || t.closest?.("a") || t.closest?.('[role="button"]'))) {
      e.preventDefault();
      return;
    }
    draggingIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", String(index));
    } catch {}
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e, dropIndex) => {
  e.preventDefault();

  const fromIndexRaw = (() => {
    try {
      return e.dataTransfer.getData("text/plain");
    } catch {
      return "";
    }
  })();

  const fromIndex =
    fromIndexRaw !== "" ? Number(fromIndexRaw) : draggingIndexRef.current;

  if (fromIndex == null || Number.isNaN(fromIndex)) return;
  if (fromIndex === dropIndex) return;

  setOrder((prev) => {
    didUserReorderRef.current = true; // ✅ ADD THIS
    const updated = [...prev];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(dropIndex, 0, moved);

    // ✅ guaranteed valid key now
    const key = stableStorageKeyRef.current;
    if (key) {
      localStorage.setItem(
        key,
        JSON.stringify(updated.map((it) => String(it.id)))
      );
    }

    return updated;
  });

  draggingIndexRef.current = null;
};

  return (
    <div className={`gm-column gm-${color}`}>
      <div className="gm-column-header">{title}</div>
      <div className="gm-column-body" aria-label={`${title} column`}>
       {order.map((item, index) => (
  <GMCard
    key={`${entityKey}-${item.id}`}
    item={item}
    entityKey={entityKey}
    forceOpen={forceOpen}
    onOpenEditor={onOpenEditor}
    onOpenPanel={onOpenPanel}
    sessionId={sessionId}
    schema={schema}
fadingJoins={fadingJoins}
    showNpcPulseBeacon={showNpcPulseBeacon}
    joinHighlights={joinHighlights}
    resolveJoins={resolveJoins}
    clearJoins={clearJoins}
  />
))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card Component (expand/collapse + per-session persistence) */
/* ------------------------------------------------------------------ */

function GMCard({
  item,
  entityKey,
  forceOpen,
  onOpenEditor,
  onOpenPanel,
  sessionId,
  schema,
  showNpcPulseBeacon,
  joinHighlights,
  fadingJoins,          
  resolveJoins,
  clearJoins,
}) {

  const hydratedRef = useRef(false);  
  const [open, setOpen] = useState(false);
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);

// Re-resolve joins if card is already open after rehydrate
useEffect(() => {
  if (open && resolveJoins && item?.id) {
    resolveJoins(entityKey, item.id);
  }
}, [open, resolveJoins, entityKey, item?.id]);

  const storageKey = useMemo(() => {
    const sid = sessionId ? String(sessionId) : "no-session";
    return `${LS_CARD_OPEN_PREFIX}${sid}:${String(item.id)}`;
  }, [sessionId, item.id]);

  useEffect(() => {
    let saved = null;
    try {
      saved = localStorage.getItem(storageKey);
    } catch {
      saved = null;
    }
    if (saved === "true") setOpen(true);
    if (saved === "false") setOpen(false);
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, open ? "true" : "false");
    } catch {}
  }, [storageKey, open]);

  useEffect(() => {
    if (typeof forceOpen === "boolean") setOpen(forceOpen);
  }, [forceOpen]);

  useEffect(() => {
    if (open && contentRef.current) setHeight(contentRef.current.scrollHeight);
  }, [open, item]);

 const toggle = () => {
  setOpen((v) => {
    const next = !v;

    if (next) {
      resolveJoins(entityKey, item.id);
   } else {
  clearJoins({ entityKey, recordId: item.id });
}

    return next;
  });
};

  return (
    <div
  className={`gm-card ${open ? "is-open" : ""} ${
  joinHighlights?.[entityKey]?.includes(String(item.id))
    ? "gm-join-pulse"
    : fadingJoins?.[entityKey]?.includes(String(item.id))
    ? "gm-join-fade"
    : ""
}`}
>
      <div
        className="gm-card-header"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
      >
        <span className="gm-card-title">{item?.name || "Untitled"}</span>

{entityKey === "npcs" && showNpcPulseBeacon && (
  <span
    className="npc-pulse-actions"
    style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}
  >
  <button
  type="button"
  className="gm-card-action-btn npc-pulse-btn npc-pulse-short"
  title="NPC Pulse (short)"
  onClick={(e) => {
    e.stopPropagation();
    pulseNpcClip({ npcId: item.id, durationMs: 500 });
  }}
>
  ◉
</button>

<button
  type="button"
  className="gm-card-action-btn npc-pulse-btn npc-pulse-long"
  title="NPC Pulse (long)"
  onClick={(e) => {
    e.stopPropagation();
    pulseNpcClip({ npcId: item.id, durationMs: 30000 });
  }}
>
  ◎
</button>
  </span>
)}

        <span className="gm-card-actions" style={{ display: "inline-flex", gap: 6 }}>
          <button
            type="button"
            className="gm-card-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            aria-label={open ? "Collapse details" : "Expand details"}
            title={open ? "Collapse" : "Expand"}
          >
            {open ? "−" : "+"}
          </button>

          {/* ↗ Explicit wiring:
              - Primary: Floating panel
              - Fallback: Future pop-out page */}
          <button
            type="button"
            className="gm-card-action-btn"
            onClick={(e) => {
  e.stopPropagation();

  if (onOpenPanel) {
    onOpenPanel(entityKey, item, e); // 👈 pass event
    return;
  }

  onOpenEditor?.(item.id);
}}
            aria-label="Open record"
            title="Open record"
          >
            ↗
          </button>
        </span>
      </div>

      <div
        className="gm-card-body-wrapper"
        style={{
          maxHeight: open ? `${height}px` : "0px",
          opacity: open ? 1 : 0,
        }}
        aria-hidden={!open}
      >
        <div ref={contentRef} className="gm-card-body">
          <RecordView record={item} schema={schema} />
          {!schema && <pre className="gm-json">{JSON.stringify(item, null, 2)}</pre>}
        </div>
      </div>
    </div>
  );
}

/* =========================
   Floating Window Component
========================= */
function FloatingWindow({ win, schema, onClose, onMove, onResize, clearJoins }) {
  const ref = useRef(null);
  const drag = useRef({ dx: 0, dy: 0 });

 const onMouseDown = (e) => {
  // bring to front
  onMove(win.id, win.x, win.y, true);

  const r = ref.current.getBoundingClientRect();
  drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };

    const move = (ev) => {
      onMove(win.id, ev.clientX - drag.current.dx, ev.clientY - drag.current.dy);
    };

    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: win.x,
        top: win.y,
        width: win.width,
        zIndex: win.z ?? 200,
      }}
      className={`gm-floating-panel gm-panel-${win.entityKey}`}
    >
      <div className="gm-floating-header" onMouseDown={onMouseDown}>
        <span>{win.record?.name || "Untitled"}</span>
       <button
  className="gm-card-action-btn"
  onClick={() => {
    clearJoins();
    onClose();
  }}
>
  ✕
</button>
      </div>

      <div className="gm-floating-body">
        <RecordView record={win.record} schema={schema} />
      </div>

      <div
        className="gm-panel-resize"
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startW = win.width;

          const move = (ev) => onResize(win.id, Math.max(320, startW + (ev.clientX - startX)));
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
}

