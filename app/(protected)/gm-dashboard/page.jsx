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

  /* -------- Floating Panels -------- */
  const [openPanels, setOpenPanels] = useState([]);

  /* -------- Beacons -------- */
  const [beacons, setBeacons] = useState({});
  const showPlayersBeacon = !!beacons?.player_characters;

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

  /* =========================
     Floating Panel Helpers
  ========================= */
  const lookupRecord = (entityKey, id) => {
    const map = { events, npcs, encounters, locations, items };
    return map[entityKey]?.find((r) => String(r.id) === String(id)) || null;
  };

  const openPanel = (entityKey, record) => {
    if (!record?.id) return;
    setOpenPanels((prev) => {
      // prevent duplicates
      if (prev.some((p) => String(p.id) === String(record.id))) return prev;
      return [...prev, { id: record.id, entityKey, record, width: 30 }];
    });
  };

  const closePanel = (id) => {
    setOpenPanels((prev) => prev.filter((p) => String(p.id) !== String(id)));
  };

  const movePanel = (fromIndex, toIndex) => {
    setOpenPanels((prev) => {
      if (
        fromIndex == null ||
        toIndex == null ||
        Number.isNaN(fromIndex) ||
        Number.isNaN(toIndex) ||
        fromIndex === toIndex
      )
        return prev;

      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const resizePanel = (id, width) => {
    setOpenPanels((prev) =>
      prev.map((p) =>
        String(p.id) === String(id)
          ? { ...p, width: Math.min(40, Math.max(30, Number(width) || 30)) }
          : p
      )
    );
  };

  /* =========================
     Persist Panels Per Session
  ========================= */
  useEffect(() => {
    if (!selectedSession?.id) return;

    try {
      localStorage.setItem(
        `${LS_OPEN_PANELS_PREFIX}${selectedSession.id}`,
        JSON.stringify(openPanels.map(({ id, entityKey, width }) => ({ id, entityKey, width })))
      );
    } catch {}
  }, [openPanels, selectedSession?.id]);

  useEffect(() => {
    if (!selectedSession?.id) return;

    const key = `${LS_OPEN_PANELS_PREFIX}${selectedSession.id}`;
    let saved = null;

    try {
      saved = localStorage.getItem(key);
    } catch {
      saved = null;
    }
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      const restored = (Array.isArray(parsed) ? parsed : [])
        .map((p) => {
          const record = lookupRecord(p.entityKey, p.id);
          if (!record) return null;
          return { ...p, record, width: Math.min(40, Math.max(30, Number(p.width) || 30)) };
        })
        .filter(Boolean);

      setOpenPanels(restored);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession?.id, events, npcs, encounters, locations, items]);

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
        if (k.startsWith(LS_OPEN_PANELS_PREFIX)) localStorage.removeItem(k);
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
    setOpenPanels([]);
  };

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
    setOpenPanels([]);

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
        setEvents(Array.isArray(eventsRes) ? eventsRes : []);
        setNpcs(Array.isArray(npcsRes) ? npcsRes : []);
        setEncounters(Array.isArray(encountersRes) ? encountersRes : []);
        setLocations(Array.isArray(locationsRes) ? locationsRes : []);
        setItems(Array.isArray(itemsRes) ? itemsRes : []);
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
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            className="gm-card-action-btn"
            onClick={() => setExpandAll(true)}
            disabled={!canUseSession}
          >
            Expand All
          </button>

          <button
            type="button"
            className="gm-card-action-btn"
            onClick={() => setExpandAll(false)}
            disabled={!canUseSession}
          >
            Collapse All
          </button>

          <button type="button" className="gm-card-action-btn" onClick={resetToDefault}>
            Reset to Default
          </button>
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
            forceOpen={expandAll}
            sessionId={selectedSession.id}
            schema={DISPLAY_SCHEMAS.events}
            onOpenPanel={openPanel} // ✅ NEW wiring
            onOpenEditor={(id) => router.push(editorPathFor("events", id))}
          />

          <GMColumn
            title="NPCs"
            color="blue"
            entityKey="npcs"
            items={npcs}
            forceOpen={expandAll}
            sessionId={selectedSession.id}
            schema={DISPLAY_SCHEMAS.npcs}
            onOpenPanel={openPanel} // ✅ NEW wiring
            onOpenEditor={(id) => router.push(editorPathFor("npcs", id))}
          />

          <GMColumn
            title="Encounters"
            color="green"
            entityKey="encounters"
            items={encounters}
            forceOpen={expandAll}
            sessionId={selectedSession.id}
            schema={DISPLAY_SCHEMAS.encounters}
            onOpenPanel={openPanel} // ✅ NEW wiring
            onOpenEditor={(id) => router.push(editorPathFor("encounters", id))}
          />

          <GMColumn
            title="Locations"
            color="purple"
            entityKey="locations"
            items={locations}
            forceOpen={expandAll}
            sessionId={selectedSession.id}
            schema={DISPLAY_SCHEMAS.locations}
            onOpenPanel={openPanel} // ✅ NEW wiring
            onOpenEditor={(id) => router.push(editorPathFor("locations", id))}
          />

          <GMColumn
            title="Items"
            color="orange"
            entityKey="items"
            items={items}
            forceOpen={expandAll}
            sessionId={selectedSession.id}
            schema={DISPLAY_SCHEMAS.items}
            onOpenPanel={openPanel} // ✅ NEW wiring
            onOpenEditor={(id) => router.push(editorPathFor("items", id))}
          />
        </div>
      )}

      {loading && <div className="gm-loading">Loading…</div>}

      {/* Floating Panel Rail */}
      {openPanels.length > 0 && (
        <div className="gm-panel-rail">
          {openPanels.map((panel, index) => (
            <FloatingPanel
              key={`${panel.entityKey}:${panel.id}`}
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
  forceOpen,
  sessionId,
  onOpenEditor, // keep for future pop-out pages
  onOpenPanel,  // ✅ NEW
  schema,
}) {
  const [order, setOrder] = useState([]);
  const draggingIndexRef = useRef(null);

  const storageKey = useMemo(() => {
    if (!sessionId) return null;
    return `${LS_ORDER_PREFIX}${sessionId}:${entityKey}`;
  }, [sessionId, entityKey]);

  useEffect(() => {
    if (!Array.isArray(items)) {
      setOrder([]);
      return;
    }

    if (!storageKey) {
      setOrder(items);
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
  }, [items, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
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

    const fromIndex = fromIndexRaw !== "" ? Number(fromIndexRaw) : draggingIndexRef.current;
    if (fromIndex == null || Number.isNaN(fromIndex)) return;
    if (fromIndex === dropIndex) return;

    setOrder((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(dropIndex, 0, moved);
      return updated;
    });

    draggingIndexRef.current = null;
  };

  return (
    <div className={`gm-column gm-${color}`}>
      <div className="gm-column-header">{title}</div>

      <div className="gm-column-body" aria-label={`${title} column`}>
        {order.map((item, index) => (
          <div
            key={item.id}
            className="gm-drag-wrapper"
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, index)}
          >
            <GMCard
              item={item}
              entityKey={entityKey}   // ✅ needed for explicit wiring
              forceOpen={forceOpen}
              onOpenEditor={onOpenEditor}
              onOpenPanel={onOpenPanel} // ✅ NEW
              sessionId={sessionId}
              schema={schema}
            />
          </div>
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
}) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);

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

  const toggle = () => setOpen((v) => !v);

  return (
    <div className={`gm-card ${open ? "is-open" : ""}`}>
      <div
        className="gm-card-header"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
      >
        <span className="gm-card-title">{item?.name || "Untitled"}</span>

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
                onOpenPanel(entityKey, item);
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
   Floating Panel Component
========================= */
function FloatingPanel({ panel, index, schema, onClose, onMove, onResize }) {
  const onDragStart = (e) => {
    try {
      e.dataTransfer.setData("text/plain", String(index));
    } catch {}
    e.dataTransfer.effectAllowed = "move";
  };

  const onDrop = (e) => {
    e.preventDefault();
    let fromRaw = "";
    try {
      fromRaw = e.dataTransfer.getData("text/plain");
    } catch {}
    const from = Number(fromRaw);
    if (!Number.isNaN(from)) onMove(from, index);
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
        <button
          type="button"
          className="gm-card-action-btn"
          onClick={onClose}
          aria-label="Close panel"
          title="Close"
        >
          ✕
        </button>
      </div>

      <div className="gm-floating-body">
        <RecordView record={panel.record} schema={schema} />
        {!schema && <pre className="gm-json">{JSON.stringify(panel.record, null, 2)}</pre>}
      </div>

      {/* Resize handle: 30% -> 40% */}
      <div
        className="gm-panel-resize"
        onMouseDown={(e) => {
          e.preventDefault();

          const startX = e.clientX;
          const startWidth = Number(panel.width) || 30;

          const onMoveEvt = (ev) => {
            const delta = ev.clientX - startX;
            const percent = (delta / window.innerWidth) * 100;
            onResize(panel.id, startWidth + percent);
          };

          const onUp = () => {
            window.removeEventListener("mousemove", onMoveEvt);
            window.removeEventListener("mouseup", onUp);
          };

          window.addEventListener("mousemove", onMoveEvt);
          window.addEventListener("mouseup", onUp);
        }}
        aria-hidden="true"
      />
    </div>
  );
}
