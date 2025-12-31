"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * PlayerCharactersWidget
 * - Floating widget that can be dragged
 * - Snaps to nearest corner on drop
 * - Persists position per-user (via /api/account id; falls back safely)
 * - Loads player characters for the selected campaign
 *
 * Expected route:
 *   GET /api/player-characters?campaign_id=...
 */
export default function PlayerCharactersWidget({ campaignId }) {
  const widgetRef = useRef(null);

  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- per-user storage key (best-effort) ---
  const [userScope, setUserScope] = useState("anon");
  useEffect(() => {
    let cancelled = false;

    // Best-effort: derive a stable per-user key
    fetch("/api/account")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;

        // Try several common shapes
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

  const storageKey = useMemo(() => {
    // Keep key stable across pages; still per-user, per-widget
    return `lw:widgetpos:${userScope}:player_characters`;
  }, [userScope]);

  // --- position state ---
  const MARGIN = 16;

  const [pos, setPos] = useState(() => ({
    x: null,
    y: null,
    // corner is informational; used when restoring
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
    if (!el) return { w: 280, h: 220 }; // reasonable fallback
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
      d: (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y),
    }));
    entries.sort((a, b) => a.d - b.d);
    return { corner: entries[0].k, ...entries[0].p };
  }

  function persistPosition(next) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  // --- restore saved position (or default bottom-right snap) ---
  useEffect(() => {
    // Wait for DOM so we can compute sizes for snapping
    const t = setTimeout(() => {
      let saved = null;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) saved = JSON.parse(raw);
      } catch {
        saved = null;
      }

      // If we have saved x/y, clamp to current viewport
      if (saved && typeof saved.x === "number" && typeof saved.y === "number") {
        const vp = getViewport();
        const sz = getWidgetSize();
        const x = clamp(saved.x, MARGIN, vp.w - sz.w - MARGIN);
        const y = clamp(saved.y, MARGIN, vp.h - sz.h - MARGIN);
        setPos({ x, y, corner: saved.corner || "br" });
        return;
      }

      // Default: snap to bottom-right
      const snapped = snapToNearestCorner(999999, 999999); // effectively br
      setPos({ x: snapped.x, y: snapped.y, corner: snapped.corner });
      persistPosition({ x: snapped.x, y: snapped.y, corner: snapped.corner });
    }, 0);

    return () => clearTimeout(t);
  }, [storageKey]);

  // Re-clamp when viewport changes
  useEffect(() => {
    const onResize = () => {
      setPos((prev) => {
        if (typeof prev.x !== "number" || typeof prev.y !== "number") return prev;
        const vp = getViewport();
        const sz = getWidgetSize();
        const x = clamp(prev.x, MARGIN, vp.w - sz.w - MARGIN);
        const y = clamp(prev.y, MARGIN, vp.h - sz.h - MARGIN);
        const next = { ...prev, x, y };
        persistPosition(next);
        return next;
      });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [storageKey]);

  // --- drag handlers (use Pointer Events) ---
  function onPointerDown(e) {
    // Only left-click / primary pointer
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
    } catch {
      // ignore
    }

    e.preventDefault();
    e.stopPropagation();
  }

  function onPointerMove(e) {
    if (!dragging.current) return;

    const vp = getViewport();
    const sz = getWidgetSize();

    const xRaw = e.clientX - dragOffset.current.dx;
    const yRaw = e.clientY - dragOffset.current.dy;

    const x = clamp(xRaw, MARGIN, vp.w - sz.w - MARGIN);
    const y = clamp(yRaw, MARGIN, vp.h - sz.h - MARGIN);

    setPos((prev) => ({ ...prev, x, y }));
  }

  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;

    setPos((prev) => {
      if (typeof prev.x !== "number" || typeof prev.y !== "number") return prev;

      // Snap on drop
      const snapped = snapToNearestCorner(prev.x, prev.y);
      const next = { x: snapped.x, y: snapped.y, corner: snapped.corner };
      persistPosition(next);
      return next;
    });
  }

  // --- load player characters for campaign ---
  useEffect(() => {
    if (!campaignId) return;

    setLoading(true);
    fetch(`/api/player-characters?campaign_id=${campaignId}`)
      .then((r) => r.json())
      .then((data) => setCharacters(Array.isArray(data) ? data : []))
      .catch(() => setCharacters([]))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const style = {
    position: "fixed",
    left: typeof pos.x === "number" ? `${pos.x}px` : undefined,
    top: typeof pos.y === "number" ? `${pos.y}px` : undefined,
    // if not yet computed, default to br-ish without jumping
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
        title="Drag to move • Snaps to corner on drop"
        style={{ cursor: "grab", userSelect: "none", touchAction: "none" }}
      >
        Player Characters
        <span style={{ marginLeft: 8, opacity: 0.65, fontSize: 12 }}>
          (drag)
        </span>
      </div>

      {!campaignId ? (
        <div className="widget-empty">Select a campaign from the GM Dashboard</div>
      ) : loading ? (
        <div className="widget-loading">Loading…</div>
      ) : (
        <ul className="widget-list">
          {characters.map((pc) => (
            <li key={pc.id}>
              <strong>{pc.character_name}</strong>
              <span className="sub">
                {pc.first_name} {pc.last_name}
              </span>
            </li>
          ))}
          {characters.length === 0 && (
            <li style={{ opacity: 0.75 }}>No player characters found.</li>
          )}
        </ul>
      )}
    </div>
  );
}
