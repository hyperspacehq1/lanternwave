"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./gm-dashboard.css";
import PlayerCharactersWidget from "@/components/widgets/PlayerCharactersWidget";
import { DISPLAY_SCHEMAS as BASE_SCHEMAS } from "@/lib/gm/displaySchemas";

const LS_LAST_CAMPAIGN = "gm:lastCampaignId";
const LS_LAST_SESSION_BY_CAMPAIGN_PREFIX = "gm:lastSessionId:";
const LS_ORDER_PREFIX = "gm-order:";
const LS_CARD_OPEN_PREFIX = "gm-card-open:";

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

/* ------------------------------
   Render helpers (field view)
------------------------------ */

function renderValue(value, type) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;

  if (type === "json") {
    return <pre className="gm-json">{JSON.stringify(value, null, 2)}</pre>;
  }

  // default text
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

  const [loading, setLoading] = useState(false);
  const [expandAll, setExpandAll] = useState(null);

  // Beacons (server)
  const [beacons, setBeacons] = useState({});

  // Schemas (merge base + add missing ones locally)
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

  useEffect(() => {
    fetch("/api/beacons", { cache: "no-store", credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBeacons(d?.beacons ?? {}))
      .catch(() => setBeacons({}));
  }, []);

  // ✅ Players beacon key compatibility (handles old/new key names)
  const showPlayersBeacon =
    !!beacons?.player_characters ||
    !!beacons?.players ||
    !!beacons?.playerCharacters;

  /* ---------------- Reset to Default ---------------- */

  const resetToDefault = () => {
    try {
      localStorage.removeItem(LS_LAST_CAMPAIGN);
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith(LS_LAST_SESSION_BY_CAMPAIGN_PREFIX)) localStorage.removeItem(k);
        if (k.startsWith(LS_ORDER_PREFIX)) localStorage.removeItem(k);
        if (k.startsWith(LS_CARD_OPEN_PREFIX)) localStorage.removeItem(k);
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
  };

  /* ---------------- Campaigns ---------------- */

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

  /* ---------------- Sessions ---------------- */

  useEffect(() => {
    if (!selectedCampaign) return;

    setSelectedSession(null);
    setEvents([]);
    setNpcs([]);
    setEncounters([]);
    setLocations([]);
    setItems([]);

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

  /* ---------------- Load Data (FIXED PARAMS) ---------------- */

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
      .then(([events, npcs, encounters, locations, items]) => {
        setEvents(Array.isArray(events) ? events : []);
        setNpcs(Array.isArray(npcs) ? npcs : []);
        setEncounters(Array.isArray(encounters) ? encounters : []);
        setLocations(Array.isArray(locations) ? locations : []);
        setItems(Array.isArray(items) ? items : []);
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

  const canUseSession = !!selectedSession?.id;

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

  return (
    <div className="gm-page">
      {/* ---------------- Toolbar (RESTORED LEFT/RIGHT LAYOUT) ---------------- */}
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
      {selectedCampaign && !selectedSession && (
        <div className="gm-empty">Select or create a session.</div>
      )}

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
            onOpenEditor={(id) => router.push(editorPathFor("items", id))}
          />
        </div>
      )}

      {loading && <div className="gm-loading">Loading…</div>}

      {/* Beacon-controlled widget */}
      {selectedCampaign?.id && showPlayersBeacon && (
        <PlayerCharactersWidget campaignId={selectedCampaign.id} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Column Component (drag reorder + persistence) */
/* ------------------------------------------------------------------ */

function GMColumn({ title, color, entityKey, items, forceOpen, sessionId, onOpenEditor, schema }) {
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

    const saved = localStorage.getItem(storageKey);
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

    // ✅ FIX: normalize saved IDs to strings so includes/merge works reliably
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
    const ids = order.map((it) => String(it.id));
    localStorage.setItem(storageKey, JSON.stringify(ids));
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
              forceOpen={forceOpen}
              onOpenEditor={onOpenEditor}
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

function GMCard({ item, forceOpen, onOpenEditor, sessionId, schema }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);

  const storageKey = useMemo(() => {
    const sid = sessionId ? String(sessionId) : "no-session";
    return `${LS_CARD_OPEN_PREFIX}${sid}:${String(item.id)}`;
  }, [sessionId, item.id]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved === "true") setOpen(true);
    if (saved === "false") setOpen(false);
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, open ? "true" : "false");
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
      <div className="gm-card-header" role="button" tabIndex={0} aria-expanded={open} onClick={toggle}>
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

          <button
            type="button"
            className="gm-card-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenEditor?.(item.id);
            }}
            aria-label="Open in editor"
            title="Open in editor"
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
          {/* Field view instead of dumping JSON */}
          <RecordView record={item} schema={schema} />

          {/* Safety fallback: if schema missing, show minimal JSON */}
          {!schema && <pre className="gm-json">{JSON.stringify(item, null, 2)}</pre>}
        </div>
      </div>
    </div>
  );
}
