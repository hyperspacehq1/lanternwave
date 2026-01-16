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
  const [showSanity, setShowSanity] = useState(false);

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
      setShowSanity(!!s.showSanity);
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
          showSanity,
          pos,
          ...next,
        })
      );
    } catch {}
  }

  /* Drag */
  const MARGIN = 16;
  const dragging = useRef(false);
  const dragOffset = useRef({ dx: 0, dy: 0 });

  function onDragStart(e) {
    dragging.current = true;
    const r = widgetRef.current.getBoundingClientRect();
    dragOffset.current = {
      dx: e.clientX - r.left,
      dy: e.clientY - r.top,
    };
    widgetRef.current.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging.current) return;
    const r = widgetRef.current.getBoundingClientRect();

    setPos({
      x: Math.max(MARGIN, Math.min(e.clientX - dragOffset.current.dx, window.innerWidth - r.width - MARGIN)),
      y: Math.max(MARGIN, Math.min(e.clientY - dragOffset.current.dy, window.innerHeight - r.height - MARGIN)),
    });
  }

  function onPointerUp(e) {
    dragging.current = false;
    persistUI({ pos });
    try {
      widgetRef.current.releasePointerCapture(e.pointerId);
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
  }, [campaignId]);

  const orderedPlayers = order.map((id) => players.find((p) => p.id === id)).filter(Boolean);

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
      {/* HEADER */}
      <div className="player-widget__header" onPointerDown={onDragStart}>
        <div className="player-widget__title">Players</div>

        <div className="player-widget__controls">
          {/* Sanity Toggle */}
          <button
            className="player-widget__sanity-toggle"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              const v = !showSanity;
              setShowSanity(v);
              persistUI({ showSanity: v });
            }}
            title="Toggle Sanity"
          >
            <img src="/sanity.png" alt="Sanity" />
          </button>

          <span
            className="player-widget__icon"
            onPointerDown={(e) => e.stopPropagation()}
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
            <ul className="player-widget__list vertical">
              {orderedPlayers.map((p) => (
                <li key={p.id} className="player-widget__player">
                  <div className="player-widget__text">
                    <div className="player-widget__character">{p.character_name}</div>
                    <div className="player-widget__name">
                      {`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()}
                    </div>
                  </div>

                  {showSanity && (
                    <div className="player-widget__sanity">
                      <button>-</button>
                      <button>+</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
