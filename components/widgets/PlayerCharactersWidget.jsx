"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./PlayerCharactersWidget.css";

export default function PlayerCharactersWidget({ campaignId }) {
  const widgetRef = useRef(null);

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  /* UI state */
  const [collapsed, setCollapsed] = useState(false);
  const [layout, setLayout] = useState("vertical");
  const [inactive, setInactive] = useState({});
  const [turns, setTurns] = useState({});
  const [order, setOrder] = useState([]);

  /* User scope */
  const [userScope, setUserScope] = useState("anon");
  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((d) => setUserScope(d?.id || "anon"))
      .catch(() => setUserScope("anon"));
  }, []);

  const storageKey = useMemo(() => `lw:widget:${userScope}:players`, [userScope]);

  /* Restore UI */
  const [pos, setPos] = useState({ x: null, y: null });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const s = JSON.parse(raw);
      setCollapsed(!!s.collapsed);
      setLayout(s.layout || "vertical");
      setInactive(s.inactive || {});
      setTurns(s.turns || {});
      setOrder(s.order || []);
      if (s.pos) setPos(s.pos);
    } catch {}
  }, [storageKey]);

  function persistUI(next) {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          collapsed,
          layout,
          inactive,
          turns,
          order,
          pos,
          ...next,
        })
      );
    } catch {}
  }

  /* Position + Drag */
  const MARGIN = 16;
  const dragging = useRef(false);
  const dragOffset = useRef({ dx: 0, dy: 0 });

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function onDragStart(e) {
    dragging.current = true;
    const r = widgetRef.current.getBoundingClientRect();
    dragOffset.current = {
      dx: e.clientX - r.left,
      dy: e.clientY - r.top,
    };
    widgetRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging.current) return;

    // ✅ FIX: clamp using the *actual current widget size* (vertical is fit-content)
    const r = widgetRef.current?.getBoundingClientRect();
    const w = r?.width ?? 480;
    const h = r?.height ?? 260;

    const next = {
      x: clamp(e.clientX - dragOffset.current.dx, MARGIN, window.innerWidth - w - MARGIN),
      y: clamp(e.clientY - dragOffset.current.dy, MARGIN, window.innerHeight - h - MARGIN),
    };

    setPos(next);
    persistUI({ pos: next });
  }

  function onPointerUp(e) {
    dragging.current = false;
    try {
      widgetRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
  }

  /* Load players */
  useEffect(() => {
    if (!campaignId) return;
    setLoading(true);
    fetch(`/api/players?campaign_id=${campaignId}`)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setPlayers(list);
        if (!order.length) setOrder(list.map((p) => p.id));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  /* Ordered players */
  const orderedPlayers = order.map((id) => players.find((p) => p.id === id)).filter(Boolean);

  /* Reorder logic */
  function movePlayer(from, to) {
    if (from === to) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrder(next);
    persistUI({ order: next });
  }

  // ✅ yellow eye icons (SVG) so color is controllable in CSS
  function EyeIcon({ slashed = false }) {
    return slashed ? (
      <svg className="player-widget__eye" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M2.1 3.5 3.5 2.1 21.9 20.5 20.5 21.9 17.9 19.3c-1.8.9-3.8 1.4-5.9 1.4C6.2 20.7 1.7 16 0.7 12c.5-2 2-4.2 4.2-6L2.1 3.5Zm5 5 1.7 1.7a3.5 3.5 0 0 0 4.9 4.9l1.7 1.7c-1 .5-2.2.8-3.4.8a5.5 5.5 0 0 1-5.5-5.5c0-1.2.3-2.4.8-3.4Zm4.9-3.2c3.7 0 8.1 4.7 9.1 8.7-.4 1.6-1.5 3.3-3.1 4.7l-2.2-2.2a5.5 5.5 0 0 0-7.2-7.2L6.8 7.1C8.2 6 10 5.3 12 5.3Zm0 3a3.5 3.5 0 0 1 3.5 3.5c0 .6-.1 1.2-.4 1.7l-4.8-4.8c.5-.3 1.1-.4 1.7-.4Z"
        />
      </svg>
    ) : (
      <svg className="player-widget__eye" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 5c5 0 9.3 4.4 10.4 7-.9 2.6-5.3 7-10.4 7S2.7 14.6 1.6 12C2.7 9.4 7 5 12 5Zm0 2C8.2 7 4.6 10.3 3.7 12c.9 1.7 4.5 5 8.3 5s7.4-3.3 8.3-5C19.4 10.3 15.8 7 12 7Zm0 1.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5Zm0 2A1.5 1.5 0 1 0 13.5 12 1.5 1.5 0 0 0 12 10.5Z"
        />
      </svg>
    );
  }

  return (
    <div
      ref={widgetRef}
      className="player-widget"
      data-layout={layout}
      style={{
        position: "fixed",
        zIndex: 9999,
        left: pos.x ?? "auto",
        top: pos.y ?? "auto",
        right: pos.x == null ? MARGIN : "auto",
        bottom: pos.y == null ? MARGIN : "auto",
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* HEADER = DRAG HANDLE */}
      <div className="player-widget__header" onPointerDown={onDragStart}>
        <div className="player-widget__title">Players</div>

        <div className="player-widget__controls">
          <span
            className="player-widget__icon"
            onPointerDown={(e) => e.stopPropagation()}
            title="Reset Turns"
            onClick={() => {
              setTurns({});
              persistUI({ turns: {} });
            }}
          >
            ↺
          </span>

          <span
            className="player-widget__icon"
            onPointerDown={(e) => e.stopPropagation()}
            title="Layout"
            onClick={() => {
              const v = layout === "vertical" ? "horizontal" : "vertical";
              setLayout(v);
              persistUI({ layout: v });
            }}
          >
            ⇄
          </span>

          <span
            className="player-widget__icon"
            onPointerDown={(e) => e.stopPropagation()}
            title="Collapse"
            onClick={() => {
              const v = !collapsed;
              setCollapsed(v);
              persistUI({ collapsed: v });
            }}
          >
            {collapsed ? "▸" : "▾"}
          </span>
        </div>
      </div>

      {!collapsed && (
        <div className="player-widget__body">
          {loading ? (
            <div>Loading…</div>
          ) : (
            <ul className={`player-widget__list ${layout}`}>
              {orderedPlayers.map((p, index) => {
                const off = inactive[p.id];
                return (
                  <li
                    key={p.id}
                    className={`player-widget__player ${off ? "inactive" : ""}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", String(index))}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const from = Number(e.dataTransfer.getData("text/plain"));
                      if (!Number.isNaN(from)) movePlayer(from, index);
                    }}
                  >
                    <input
                      className="player-widget__checkbox"
                      type="checkbox"
                      checked={!!turns[p.id]}
                      onChange={() => {
                        const n = { ...turns, [p.id]: !turns[p.id] };
                        setTurns(n);
                        persistUI({ turns: n });
                      }}
                    />

                    <div className="player-widget__text">
                      <div className="player-widget__character">{p.character_name || "—"}</div>
                      <div className="player-widget__name">
                        {`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="player-widget__hidebtn"
                      onPointerDown={(e) => e.stopPropagation()}
                      title={off ? "Unhide" : "Hide"}
                      onClick={() => {
                        const n = { ...inactive, [p.id]: !off };
                        setInactive(n);
                        persistUI({ inactive: n });
                      }}
                    >
                      <EyeIcon slashed={!off} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
