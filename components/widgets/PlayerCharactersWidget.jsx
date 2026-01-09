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

  const storageKey = useMemo(
    () => `lw:widget:${userScope}:players`,
    [userScope]
  );

  /* Restore UI */
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
  const [pos, setPos] = useState({ x: null, y: null });
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
   function onPointerUp(e) {
  dragging.current = false;
  try {
    widgetRef.current?.releasePointerCapture(e.pointerId);
  } catch {}
}

  function onPointerMove(e) {
    if (!dragging.current) return;
    const next = {
      x: clamp(
        e.clientX - dragOffset.current.dx,
        MARGIN,
        window.innerWidth - 480
      ),
      y: clamp(
        e.clientY - dragOffset.current.dy,
        MARGIN,
        window.innerHeight - 260
      ),
    };
    setPos(next);
    persistUI({ pos: next });
  }

  function onPointerUp() {
    dragging.current = false;
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
  }, [campaignId]);

  /* Ordered players */
  const orderedPlayers = order
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean);

  /* Reorder logic */
  function movePlayer(from, to) {
    if (from === to) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrder(next);
    persistUI({ order: next });
  }

  return (
    <div
      ref={widgetRef}
      className="player-widget"
      style={{
        position: "fixed",
        width: 480,
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
      <div
        className="player-widget__header"
        onPointerDown={onDragStart}
      >
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
              const v =
                layout === "vertical" ? "horizontal" : "vertical";
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
                    className={`player-widget__player ${
                      off ? "inactive" : ""
                    }`}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData(
                        "text/plain",
                        String(index)
                      )
                    }
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const from = Number(
                        e.dataTransfer.getData("text/plain")
                      );
                      if (!Number.isNaN(from)) movePlayer(from, index);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!turns[p.id]}
                      onChange={() => {
                        const n = {
                          ...turns,
                          [p.id]: !turns[p.id],
                        };
                        setTurns(n);
                        persistUI({ turns: n });
                      }}
                    />

                    <div className="player-widget__text">
                      <div className="player-widget__character">
                        {p.character_name || "—"}
                      </div>
                      <div className="player-widget__name">
                        {`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()}
                      </div>
                    </div>

                    <span
                      className="player-widget__icon" 
                      onPointerDown={(e) => e.stopPropagation()}
                      title={off ? "Unhide" : "Hide"}
                      onClick={() => {
                        const n = {
                          ...inactive,
                          [p.id]: !off,
                        };
                        setInactive(n);
                        persistUI({ inactive: n });
                      }}
                    >
                      {off ? "👁" : "🚫"}
                    </span>
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

