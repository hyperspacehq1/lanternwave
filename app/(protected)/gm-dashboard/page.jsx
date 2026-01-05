"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./gm-dashboard.css";
import PlayerCharactersWidget from "@/components/widgets/PlayerCharactersWidget";

/**
 * GM Dashboard
 * Read-only orchestration view for campaign content
 *
 * Notes:
 * - No DB writes. Reorder + expand state are localStorage only.
 * - Uses existing GET routes (/api/*).
 * - "Open" navigates to editor pages (e.g. /events/:id).
 */

const LS_LAST_CAMPAIGN = "gm:lastCampaignId";
const LS_LAST_SESSION_BY_CAMPAIGN_PREFIX = "gm:lastSessionId:"; // gm:lastSessionId:<campaignId>
const LS_ORDER_PREFIX = "gm-order:"; // gm-order:<sessionId>:<entityKey>
const LS_CARD_OPEN_PREFIX = "gm-card-open:"; // gm-card-open:<sessionId>:<itemId>

/* ------------------------------------------------------------------ */
/* Display Schemas (UI-only: what to show in expanded view) */
/* ------------------------------------------------------------------ */

const DISPLAY_SCHEMAS = {
  events: [
    { key: "name", label: "Name" },
    { key: "eventType", label: "Event Type" },
    { key: "priority", label: "Priority" },
    { key: "description", label: "Description", type: "text" },
  ],
  encounters: [
    { key: "name", label: "Name" },
    { key: "description", label: "Description", type: "text" },
  ],
  locations: [
    { key: "name", label: "Name" },
    { key: "world", label: "World" },
    { key: "description", label: "Description", type: "text" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "sensory", label: "Sensory", type: "json" },
    { key: "addressStreet", label: "Street" },
    { key: "addressCity", label: "City" },
    { key: "addressState", label: "State" },
    { key: "addressZip", label: "Zip" },
    { key: "addressCountry", label: "Country" },
  ],
  items: [
    { key: "name", label: "Name" },
    { key: "itemType", label: "Item Type" },
    { key: "description", label: "Description", type: "text" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "properties", label: "Properties", type: "json" },
  ],
  npcs: [
    { key: "name", label: "Name" },
    { key: "npcType", label: "NPC Type" },
    { key: "factionAlignment", label: "Faction/Alignment" },
    { key: "description", label: "Description", type: "text" },
    { key: "goals", label: "Goals", type: "text" },
    { key: "secrets", label: "Secrets", type: "text" },
    { key: "notes", label: "Notes", type: "text" },
  ],
  players: [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "characterName", label: "Character Name" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
  ],
};

function renderValue(value, type) {
  if (value === null || value === undefined || value === "") return null;

  if (type === "json") {
    // Keep readable but controlled
    return <pre className="gm-json">{JSON.stringify(value, null, 2)}</pre>;
  }

  // Default/text rendering
  return <div className="gm-text">{String(value)}</div>;
}

function RecordView({ record, schema }) {
  if (!record || !schema) return null;

  return (
    <div className="gm-record">
      {schema.map(({ key, label, type }) => {
        const v = record[key];
        const rendered = renderValue(v, type);
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

/* ------------------------------------------------------------------ */
/* Utilities */
/* ------------------------------------------------------------------ */

function asDate(v) {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

function mostRecentByCreatedAt(list) {
  if (!Array.isArray(list) || list.length === 0) return null;

  // Prefer created_at when present; otherwise fall back to list order
  const withDates = list
    .map((x) => ({ x, d: asDate(x?.created_at) }))
    .filter((r) => r.d);

  if (withDates.length === 0) return list[0] || null;

  withDates.sort((a, b) => b.d - a.d);
  return withDates[0].x || null;
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

  // Expand all / collapse all broadcast
  const [expandAll, setExpandAll] = useState(null);

  // ✅ Widgets enabled/disabled (loaded from /api/widgets)
  const [widgets, setWidgets] = useState({});

  // ✅ Load widget preferences
  useEffect(() => {
    fetch("/api/widgets")
      .then((r) => r.json())
      .then((data) => setWidgets(data || {}))
      .catch(() => setWidgets({}));
  }, []);

  /* -------------------------------------------
     Reset to Default
     - Clears: last selected campaign, last selected session (all campaigns),
       per-session column ordering, per-session expand states
  -------------------------------------------- */
  const resetToDefault = () => {
    try {
      localStorage.removeItem(LS_LAST_CAMPAIGN);

      // Remove last-session-per-campaign keys
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith(LS_LAST_SESSION_BY_CAMPAIGN_PREFIX)) localStorage.removeItem(k);
        if (k.startsWith(LS_ORDER_PREFIX)) localStorage.removeItem(k);
        if (k.startsWith(LS_CARD_OPEN_PREFIX)) localStorage.removeItem(k);
      });
    } catch {
      // ignore
    }

    // Clear in-memory state too
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

  /* -------------------------------------------
     Initial load — campaigns
     - Restore last selected campaign if present
     - Otherwise select most recent created campaign
  -------------------------------------------- */
  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setCampaigns(arr);

        // Restore last campaign if possible
        let next = null;
        try {
          const savedId = localStorage.getItem(LS_LAST_CAMPAIGN);
          if (savedId) next = arr.find((c) => c.id === savedId) || null;
        } catch {
          // ignore
        }

        // If never selected before (or saved no longer exists), choose most recent created
        if (!next) next = mostRecentByCreatedAt(arr);

        if (next) setSelectedCampaign(next);
      })
      .catch(() => setCampaigns([]));
  }, []);

  /* -------------------------------------------
     Persist last selected campaign
  -------------------------------------------- */
  useEffect(() => {
    if (!selectedCampaign?.id) return;
    try {
      localStorage.setItem(LS_LAST_CAMPAIGN, selectedCampaign.id);
    } catch {
      // ignore
    }
  }, [selectedCampaign?.id]);

  /* -------------------------------------------
     Load sessions when campaign changes
     - Restore last session for that campaign if present
     - Otherwise choose most recent created session
  -------------------------------------------- */
  useEffect(() => {
    if (!selectedCampaign) return;

    setSelectedSession(null);
    setEvents([]);
    setNpcs([]);
    setEncounters([]);
    setLocations([]);
    setItems([]);

    fetch(`/api/sessions?campaign_id=${selectedCampaign.id}`)
      .then((r) => r.json())
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setSessions(arr);

        let nextSession = null;

        // Restore last session for this campaign
        try {
          const savedSessionId = localStorage.getItem(
            `${LS_LAST_SESSION_BY_CAMPAIGN_PREFIX}${selectedCampaign.id}`
          );
          if (savedSessionId) {
            nextSession = arr.find((s) => s.id === savedSessionId) || null;
          }
        } catch {
          // ignore
        }

        // If never selected before for this campaign, choose most recent created
        if (!nextSession) nextSession = mostRecentByCreatedAt(arr);

        if (nextSession) setSelectedSession(nextSession);
      })
      .catch(() => setSessions([]));
  }, [selectedCampaign]);

  /* -------------------------------------------
     Persist last selected session per campaign
  -------------------------------------------- */
  useEffect(() => {
    if (!selectedCampaign?.id || !selectedSession?.id) return;
    try {
      localStorage.setItem(
        `${LS_LAST_SESSION_BY_CAMPAIGN_PREFIX}${selectedCampaign.id}`,
        selectedSession.id
      );
    } catch {
      // ignore
    }
  }, [selectedCampaign?.id, selectedSession?.id]);

  /* -------------------------------------------
     Load all GM data when session changes
     (Data is campaign-scoped; we keep session for UI persistence keys)
  -------------------------------------------- */
  useEffect(() => {
    if (!selectedSession) return;
    if (!selectedCampaign?.id) return;

    setLoading(true);

    Promise.all([
      fetch(`/api/events?campaign_id=${selectedCampaign.id}`).then((r) => r.json()),
      fetch(`/api/npcs?campaign_id=${selectedCampaign.id}`).then((r) => r.json()),
      fetch(`/api/encounters?campaign_id=${selectedCampaign.id}`).then((r) => r.json()),
      fetch(`/api/locations?campaign_id=${selectedCampaign.id}`).then((r) => r.json()),
      fetch(`/api/items?campaign_id=${selectedCampaign.id}`).then((r) => r.json()),
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
  }, [selectedSession, selectedCampaign?.id]);

  /* -------------------------------------------
     Helpers for editor navigation
  -------------------------------------------- */
  const editorPathFor = (entityKey, id) => {
    const base = {
      campaigns: "campaigns",
      sessions: "sessions",
      events: "events",
      npcs: "npcs",
      locations: "locations",
      encounters: "encounters",
      items: "items",
    }[entityKey];

    if (!base || !id) return null;
    return `/${base}/${id}`;
  };

  const canUseSession = !!selectedSession?.id;

  return (
    <div className="gm-page">
      {/* -------------------- TOOLBAR -------------------- */}
      <div className="gm-toolbar" role="region" aria-label="GM Dashboard controls">
        <select
          aria-label="Select campaign"
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
          aria-label="Select session"
          disabled={!selectedCampaign}
          value={selectedSession?.id || ""}
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

        <div className="gm-controls" style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            type="button"
            className="gm-card-action-btn"
            onClick={() => setExpandAll(true)}
            disabled={!canUseSession}
            aria-label="Expand all cards"
            title="Expand all"
          >
            Expand All
          </button>

          <button
            type="button"
            className="gm-card-action-btn"
            onClick={() => setExpandAll(false)}
            disabled={!canUseSession}
            aria-label="Collapse all cards"
            title="Collapse all"
          >
            Collapse All
          </button>

          <button
            type="button"
            className="gm-card-action-btn"
            onClick={resetToDefault}
            aria-label="Reset dashboard view to default"
            title="Reset to default"
          >
            Reset to Default
          </button>
        </div>
      </div>

      {/* -------------------- MAIN GRID -------------------- */}
      <div className="gm-grid" role="region" aria-label="GM Dashboard columns">
        <GMColumn
          title="Events"
          color="red"
          entityKey="events"
          items={events}
          forceOpen={expandAll}
          sessionId={selectedSession?.id}
          onOpenEditor={(id) => {
            const path = editorPathFor("events", id);
            if (path) router.push(path);
          }}
        />

        <GMColumn
          title="NPCs"
          color="blue"
          entityKey="npcs"
          items={npcs}
          forceOpen={expandAll}
          sessionId={selectedSession?.id}
          onOpenEditor={(id) => {
            const path = editorPathFor("npcs", id);
            if (path) router.push(path);
          }}
        />

        <GMColumn
          title="Encounters"
          color="green"
          entityKey="encounters"
          items={encounters}
          forceOpen={expandAll}
          sessionId={selectedSession?.id}
          onOpenEditor={(id) => {
            const path = editorPathFor("encounters", id);
            if (path) router.push(path);
          }}
        />

        <GMColumn
          title="Locations"
          color="purple"
          entityKey="locations"
          items={locations}
          forceOpen={expandAll}
          sessionId={selectedSession?.id}
          onOpenEditor={(id) => {
            const path = editorPathFor("locations", id);
            if (path) router.push(path);
          }}
        />

        <GMColumn
          title="Items"
          color="orange"
          entityKey="items"
          items={items}
          forceOpen={expandAll}
          sessionId={selectedSession?.id}
          onOpenEditor={(id) => {
            const path = editorPathFor("items", id);
            if (path) router.push(path);
          }}
        />
      </div>

      {loading && <div className="gm-loading">Loading…</div>}

      {/* ✅ Render widget ONCE at page root */}
      {selectedCampaign?.id && (
        <PlayerCharactersWidget campaignId={selectedCampaign.id} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Column Component (with drag reorder + persistence) */
/* ------------------------------------------------------------------ */

function GMColumn({ title, color, entityKey, items, forceOpen, sessionId, onOpenEditor }) {
  const [order, setOrder] = useState([]);
  const draggingIndexRef = useRef(null);

  const storageKey = useMemo(() => {
    if (!sessionId) return null;
    return `gm-order:${sessionId}:${entityKey}`;
  }, [sessionId, entityKey]);

  // Apply stored order whenever items change
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

  // Persist order on change
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
            aria-grabbed="false"
          >
            <GMCard
              item={item}
              entityKey={entityKey}
              forceOpen={forceOpen}
              onOpenEditor={onOpenEditor}
              sessionId={sessionId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card Component (animated expand/collapse + per-session persistence) */
/* ------------------------------------------------------------------ */

function GMCard({ item, entityKey, forceOpen, onOpenEditor, sessionId }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);

  // ✅ per-session key now
  const storageKey = useMemo(() => {
    const sid = sessionId ? String(sessionId) : "no-session";
    return `${LS_CARD_OPEN_PREFIX}${sid}:${String(item.id)}`;
  }, [sessionId, item.id]);

  // Restore per-card state (per session)
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved === "true") setOpen(true);
    if (saved === "false") setOpen(false);
  }, [storageKey]);

  // Persist state (per session)
  useEffect(() => {
    localStorage.setItem(storageKey, open ? "true" : "false");
  }, [storageKey, open]);

  // Apply global expand/collapse
  useEffect(() => {
    if (typeof forceOpen === "boolean") {
      setOpen(forceOpen);
    }
  }, [forceOpen]);

  // Measure height for animation
  useEffect(() => {
    if (open && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [open, item]);

  const toggle = () => setOpen((v) => !v);

  const onHeaderKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
    if (e.key === "o" || e.key === "O") {
      e.preventDefault();
      onOpenEditor?.(item.id);
    }
  };

  const schema = DISPLAY_SCHEMAS[entityKey] || null;

  return (
    <div className={`gm-card ${open ? "is-open" : ""}`}>
      <div
        className="gm-card-header"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onDoubleClick={() => onOpenEditor?.(item.id)}
        onKeyDown={onHeaderKeyDown}
        title="Enter/Space to toggle • O to open editor"
      >
        <span className="gm-card-title">{item.name || "Untitled"}</span>

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
          {/* ✅ Replace raw JSON dump with schema-driven UI */}
          <RecordView record={item} schema={schema} />
        </div>
      </div>
    </div>
  );
}
