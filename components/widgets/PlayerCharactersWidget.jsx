"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * PlayersWidget
 * - Floating widget that can be dragged
 * - Snaps to nearest corner on drop
 * - Persists position per-user
 * - Loads players for the selected campaign
 *
 * Expected route:
 *   GET /api/players?campaign_id=...
 */
export default function PlayerCharactersWidget({ campaignId }) {
  const widgetRef = useRef(null);

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  /* -------------------------------------------------
     Per-user storage key (best effort)
  -------------------------------------------------- */
  const [userScope, setUserScope] = useState("anon");
  useEffect(() => {
    let cancelled = false;

    fetch("/api/account")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;

        const id =
          data?.id ||
          data?.user?.id ||
          data?.account?.id ||
          data?.account_id ||
          data?.user_id ||
          data?.username ||
          data?.user?.username ||
          null;

        setUserScope(id ? String(id) : "anon");
      })
      .catch(() => {
        if (!cancelled) setUserScope("anon");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const storageKey = useMemo(
    () => `lw:widgetpos:${userScope}:players`,
    [userScope]
  );

  /* -------------------------------------------------
     Position state
  -------------------------------------------------- */
  const MARGIN = 16;

  const [pos, setPos] = useState(() => ({
    x: null,
    y: null,
    corner: "br",
  }));

  const dragging = useRef(false);
  const dragOffset = useRef({ dx: 0, dy: 0 });

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function getViewport() {
    return { w: window.innerWidth, h: window.innerHeight };
  }

  function getWidgetSize() {
    const el = widgetRef.current;
    if (!el) return { w: 280, h: 220 };
    const rect = el.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  function cornerPositions() {
    const vp = getViewport();
    const sz = getWidgetSize();
    return {
      tl: { x: MARGIN, y: MARGIN },
      tr: { x: vp.w - sz.w - MARGIN, y: MARGIN },
      bl: { x: MARGIN, y: vp.h - sz.h - MARGIN },
      br: { x: vp.w - sz.w - MARGIN, y: vp.h - sz.h - MARGIN },
    };
  }

  function snapToNearestCorner(x, y) {
    const corners = cornerPositions();
    const entries = Object.entries(corners).map(([k, p]) => ({
      k,
      p,
      d: (p.x - x) ** 2 + (p.y - y) ** 2,
    }));
    entries.sort((a, b) => a.d - b.d);
    return { corner: entries[0].k, ...entries[0].p };
  }

  function persistPosition(next) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  }

  /* -------------------------------------------------
     Restore saved position
  -------------------------------------------------- */
  useEffect(() => {
    const t = setTimeout(() => {
      let saved = null;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) saved = JSON.parse(raw);
      } catch {}

      if (saved && typeof saved.x === "number" && typeof saved.y === "number") {
        const vp = getViewport();
        const sz = getWidgetSize();
        setPos({
          x: clamp(saved.x, MARGIN, vp.w - sz.w - MARGIN),
          y: clamp(saved.y, MARGIN, vp.h - sz.h - MARGIN),
          corner: saved.corner || "br",
        });
        return;
      }

      const snapped = snapToNearestCorner(999999, 999999);
      setPos(snapped);
      persistPosition(snapped);
    }, 0);

    return () => clearTimeout(t);
  }, [storageKey]);

  /* -------------------------------------------------
     Drag handlers
  -------------------------------------------------- */
  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    const el = widgetRef.current;
    if (!el) return;

    dragging.current = true;
    const rect = el.getBoundingClientRect();
    dragOffset.current = {
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
    };

    try {
      el.setPointerCapture(e.pointerId);
    } catch {}

    e.preventDefault();
    e.stopPropagation();
  }

  function onPointerMove(e) {
    if (!dragging.current) return;

    const vp = getViewport();
    const sz = getWidgetSize();
    setPos({
      x: clamp(e.clientX - dragOffset.current.dx, MARGIN, vp.w - sz.w - MARGIN),
      y: clamp(e.clientY - dragOffset.current.dy, MARGIN, vp.h - sz.h - MARGIN),
    });
  }

  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;

    setPos((prev) => {
      if (typeof prev.x !== "number" || typeof prev.y !== "number") return prev;
      const snapped = snapToNearestCorner(prev.x, prev.y);
      persistPosition(snapped);
      return snapped;
    });
  }

  /* -------------------------------------------------
     Load players (GUARDED by campaignId)
  -------------------------------------------------- */
  useEffect(() => {
    if (!campaignId) return;

    setLoading(true);

    fetch(`/api/players?campaign_id=${campaignId}`)
      .then((r) => r.json())
      .then((data) => setPlayers(Array.isArray(data) ? data : []))
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const style = {
    position: "fixed",
    left: typeof pos.x === "number" ? `${pos.x}px` : undefined,
    top: typeof pos.y === "number" ? `${pos.y}px` : undefined,
    right: typeof pos.x === "number" ? undefined : `${MARGIN}px`,
    bottom: typeof pos.y === "number" ? undefined : `${MARGIN}px`,
    zIndex: 9999,
    width: 280,
    maxWidth: "calc(100vw - 32px)",
  };

  return (
    <div
      ref={widgetRef}
      className="floating-widget"
      style={style}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="widget-header"
        onPointerDown={onPointerDown}
        style={{ cursor: "grab", userSelect: "none", touchAction: "none" }}
      >
        Players
        <span style={{ marginLeft: 8, opacity: 0.65, fontSize: 12 }}>
          (drag)
        </span>
      </div>

      {!campaignId ? (
        <div className="widget-empty">
          Select a campaign from the GM Dashboard
        </div>
      ) : loading ? (
        <div className="widget-loading">Loading…</div>
      ) : (
        <ul className="widget-list">
          {players.map((p) => (
            <li key={p.id}>
              <strong>
                {p.character_name ||
                  `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()}
              </strong>
              {p.character_name && (
                <span className="sub">
                  {p.first_name} {p.last_name}
                </span>
              )}
            </li>
          ))}
          {players.length === 0 && (
            <li style={{ opacity: 0.75 }}>No players found.</li>
          )}
        </ul>
      )}
    </div>
  );
}
