"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function PlayerCharactersWidget({ campaignId }) {
  const widgetRef = useRef(null);

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  /* UI state */
  const [collapsed, setCollapsed] = useState(false);
  const [layout, setLayout] = useState("vertical"); // vertical | horizontal
  const [inactive, setInactive] = useState({});

  /* Storage scope */
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

  /* Restore UI state */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const s = JSON.parse(raw);
      setCollapsed(!!s.collapsed);
      setLayout(s.layout || "vertical");
      setInactive(s.inactive || {});
    } catch {}
  }, [storageKey]);

  function persistUI(next) {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ collapsed, layout, inactive, ...next })
      );
    } catch {}
  }

  /* Position */
  const MARGIN = 16;
  const [pos, setPos] = useState({ x: null, y: null });

  const dragging = useRef(false);
  const dragOffset = useRef({ dx: 0, dy: 0 });

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function onPointerDown(e) {
    dragging.current = true;
    const r = widgetRef.current.getBoundingClientRect();
    dragOffset.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    widgetRef.current.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging.current) return;
    setPos({
      x: clamp(e.clientX - dragOffset.current.dx, MARGIN, window.innerWidth - 380),
      y: clamp(e.clientY - dragOffset.current.dy, MARGIN, window.innerHeight - 200),
    });
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
      .then((d) => setPlayers(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [campaignId]);

  return (
    <div
      ref={widgetRef}
      className="floating-widget"
      style={{
        position: "fixed",
        left: pos.x ?? "auto",
        top: pos.y ?? "auto",
        right: pos.x == null ? MARGIN : "auto",
        bottom: pos.y == null ? MARGIN : "auto",
        width: 360,                // ✅ wider container
        zIndex: 9999,
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div
        className="widget-header"
        onPointerDown={onPointerDown}
        style={{ whiteSpace: "nowrap" }}   // ✅ no wrapping
      >
        <div className="title">
          Players — Drag → Corner → Drop
        </div>

        <div className="widget-controls">
          <span
            className="widget-icon"
            title="Collapse"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(!collapsed);
              persistUI({ collapsed: !collapsed });
            }}
          >
            {collapsed ? "▸" : "▾"}
          </span>

          <span
            className="widget-icon"
            title="Layout"
            onClick={(e) => {
              e.stopPropagation();
              const v = layout === "vertical" ? "horizontal" : "vertical";
              setLayout(v);
              persistUI({ layout: v });
            }}
          >
            ⇄
          </span>
        </div>
      </div>

      {loading ? (
        <div className="widget-body">Loading…</div>
      ) : !collapsed && (
        <div className="widget-body">
          <ul className={`widget-list ${layout}`}>
            {players.map((p) => {
              const off = inactive[p.id];
              return (
                <li
                  key={p.id}
                  className={`widget-player ${off ? "inactive" : ""}`}
                  onClick={() => {
                    const n = { ...inactive, [p.id]: !off };
                    setInactive(n);
                    persistUI({ inactive: n });
                  }}
                  title="Toggle active / inactive"
                >
                  <div className="character">
                    {p.character_name || "—"}
                  </div>
                  <div className="player">
                    {`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
