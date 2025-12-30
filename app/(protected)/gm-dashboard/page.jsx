"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * GM Dashboard
 * Read-only orchestration view for campaign content
 *
 * Notes:
 * - No DB writes. Reorder + expand state are localStorage only.
 * - Uses existing GET routes (/api/*).
 * - "Open" navigates to editor pages (e.g. /events/:id).
 */

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

  /* -------------------------------------------
     Initial load — campaigns
  -------------------------------------------- */
  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then(setCampaigns)
      .catch(() => setCampaigns([]));
  }, []);

  /* -------------------------------------------
     Load sessions when campaign changes
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
      .then(setSessions)
      .catch(() => setSessions([]));
  }, [selectedCampaign]);

  /* -------------------------------------------
     Load all GM data when session changes
  -------------------------------------------- */
  useEffect(() => {
    if (!selectedSession) return;

    setLoading(true);

    Promise.all([
      fetch(`/api/events?session_id=${selectedSession.id}`).then((r) => r.json()),
      fetch(`/api/npcs?session_id=${selectedSession.id}`).then((r) => r.json()),
      fetch(`/api/encounters?session_id=${selectedSession.id}`).then((r) => r.json()),
      fetch(`/api/locations?session_id=${selectedSession.id}`).then((r) => r.json()),
      fetch(`/api/items?session_id=${selectedSession.id}`).then((r) => r.json()),
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
  }, [selectedSession]);

  /* -------------------------------------------
     Helpers for editor navigation
  -------------------------------------------- */
  const editorPathFor = (entityKey, id) => {
    // Paths doc: editor pages are /<entity>/:id (campaigns, sessions, events, npcs, locations, encounters, items)
    // Normalize entityKey to route base:
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
            onClick={() => setExpandAll(true)}
            disabled={!canUseSession}
            aria-label="Expand all cards"
            title="Expand all"
          >
            Expand All
          </button>

          <button
            type="button"
            onClick={() => setExpandAll(false)}
            disabled={!canUseSession}
            aria-label="Collapse all cards"
            title="Collapse all"
          >
            Collapse All
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

    // Keep saved ordering for ids still present
    for (const id of savedIds) {
      const row = byId.get(String(id));
      if (row) ordered.push(row);
    }

    // Append any new items not present in saved ordering
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
    // Don’t start a drag from buttons/interactive elements
    const t = e.target;
    if (t && (t.closest?.("button") || t.closest?.("a") || t.closest?.('[role="button"]'))) {
      e.preventDefault();
      return;
    }

    draggingIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", String(index));
    } catch {
      // noop
    }
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
            <GMCard item={item} forceOpen={forceOpen} onOpenEditor={onOpenEditor} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card Component (animated expand/collapse + persistence + buttons) */
/* ------------------------------------------------------------------ */

function GMCard({ item, forceOpen, onOpenEditor }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);

  const storageKey = useMemo(() => `gm-card-open:${String(item.id)}`, [item.id]);

  // Restore per-card state
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved === "true") setOpen(true);
  }, [storageKey]);

  // Persist state
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
      // quick-open (optional)
      e.preventDefault();
      onOpenEditor?.(item.id);
    }
  };

  return (
    <div className={`gm-card ${open ? "is-open" : ""}`}>
      {/* Header is keyboard-activatable */}
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

        {/* Buttons: stop propagation so header click doesn’t also toggle */}
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

      {/* Animated body */}
      <div
        className="gm-card-body-wrapper"
        style={{
          maxHeight: open ? `${height}px` : "0px",
          opacity: open ? 1 : 0,
        }}
        aria-hidden={!open}
      >
        <div ref={contentRef} className="gm-card-body">
          <pre>{JSON.stringify(item, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
