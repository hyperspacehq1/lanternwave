"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./PlayerCharactersWidget.css";

export default function PlayerCharactersWidget({ campaignId }) {
  const widgetRef = useRef(null);

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  /* UI state */
  const [collapsed, setCollapsed] = useState(false);

  // 🔒 locked per requirement
  const layout = "vertical";

  const [inactive, setInactive] = useState({});
  const [turns, setTurns] = useState({});
  const [order, setOrder] = useState([]);

  // 🧠 Sanity UI
  const [sanityMode, setSanityMode] = useState(false);
  const [sanityEnabled, setSanityEnabled] = useState(false);

  // sanityState[playerId] = { base, current, lastLoss, lastUpdatedAt }
  const [sanityState, setSanityState] = useState({});

  // sanityFlash[playerId] = { key, textTop, textBottom, tone }
  const [sanityFlash, setSanityFlash] = useState({});

  /* -----------------------------------------------------------
     ✅ FEATURE GATING — Account Page Beacon (SOURCE OF TRUTH)
  ------------------------------------------------------------ */
  useEffect(() => {
    fetch("/api/account", {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => {
        setSanityEnabled(!!d?.account?.beacons?.player_sanity_tracker);
      })
      .catch(() => setSanityEnabled(false));
  }, []);

  /* -----------------------------------------------------------
     UI persistence (NO feature flags here)
  ------------------------------------------------------------ */
  const storageKey = "lw:widget:players";

  const [pos, setPos] = useState({ x: null, y: null });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const s = JSON.parse(raw);
      setCollapsed(!!s.collapsed);
      setInactive(s.inactive || {});
      setTurns(s.turns || {});
      setOrder(s.order || []);
      if (s.pos) setPos(s.pos);
      setSanityMode(!!s.sanityMode);
    } catch {}
  }, []);

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
          sanityMode,
          ...next,
        })
      );
    } catch {}
  }

  /* -----------------------------------------------------------
     Drag logic (UNCHANGED)
  ------------------------------------------------------------ */
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

  /* -----------------------------------------------------------
     Load players
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!campaignId) return;
    setLoading(true);
    fetch(`/api/players?campaign_id=${campaignId}`)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setPlayers(list);
        if (!order.length) setOrder(list.map((p) => p.id));

        setSanityState((prev) => {
          const next = { ...prev };
          for (const p of list) {
            const base = Number.isInteger(p?.sanity) ? p.sanity : null;
            if (!next[p.id] && Number.isInteger(base)) {
              next[p.id] = {
                base,
                current: base,
                lastLoss: 0,
                lastUpdatedAt: Date.now(),
              };
            }
          }
          return next;
        });
      })
      .finally(() => setLoading(false));
  }, [campaignId]);

  const orderedPlayers = order.map((id) => players.find((p) => p.id === id)).filter(Boolean);

  /* -----------------------------------------------------------
     Sanity helpers (UNCHANGED)
  ------------------------------------------------------------ */
  const selectedIds = useMemo(() => Object.keys(turns).filter((id) => !!turns[id]), [turns]);

  function computeSanTone(playerId) {
    const s = sanityState[playerId];
    if (!s || !Number.isInteger(s.base) || !Number.isInteger(s.current) || s.base <= 0)
      return "muted";

    if (s.lastLoss >= 5) return "yellow";
    if (s.current / s.base >= 0.8) return "green";
    return "red";
  }

  function showSanityFlash(playerId, tone, after, loss) {
    const k = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setSanityFlash((prev) => ({
      ...prev,
      [playerId]: {
        key: k,
        tone,
        textTop: "SANITY",
        textBottom: `SAN ${after}${loss ? ` (-${loss})` : ""}`,
      },
    }));

    setTimeout(() => {
      setSanityFlash((prev) => {
        const next = { ...prev };
        if (next[playerId]?.key === k) delete next[playerId];
        return next;
      });
    }, 2000);
  }

  async function rollSanityForSelected(rollType) {
    if (!campaignId || !sanityEnabled || !selectedIds.length) return;

    await Promise.all(
      selectedIds.map(async (playerId) => {
        try {
          const res = await fetch("/api/sanity/roll", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              player_id: playerId,
              campaign_id: campaignId,
              roll_type: rollType,
            }),
          });

setSanityState((prev) => ({
        ...prev,
        [playerId]: {
          base: data.base_sanity,
          current: data.current_sanity,
          lastLoss: data.sanity_loss,
          lastUpdatedAt: Date.now(),
        },
      }));

      showSanityFlash(
        playerId,
        computeSanTone(playerId),
        data.current_sanity,
        data.sanity_loss
      );
    } catch {
      showSanityFlash(playerId, "muted", "—", 0);
    }
  })
);

          const data = await res.json();
          if (!res.ok) throw new Error();

          setSanityState((prev) => ({
            ...prev,
            [playerId]: {
              base: data.base_sanity,
              current: data.current_sanity,
              lastLoss: data.sanity_loss,
              lastUpdatedAt: Date.now(),
            },
          }));

          showSanityFlash(
            playerId,
            computeSanTone(playerId),
            data.current_sanity,
            data.sanity_loss
          );
        } catch {
          showSanityFlash(playerId, "muted", "—", 0);
        }
      })
    );
  }

  /* -----------------------------------------------------------
     RESET SANITY
  ------------------------------------------------------------ */

 async function resetAllSanity() {
    if (!campaignId) return;

    const ok = window.confirm(
      "Reset sanity for ALL players in this campaign?"
    );
    if (!ok) return;

    try {
      const res = await fetch("/api/sanity/reset", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId }),
      });

      if (!res.ok) throw new Error("Reset failed");

      // Update local UI state to match DB
      setSanityState((prev) => {
        const next = { ...prev };
        for (const id in next) {
          next[id] = {
            ...next[id],
            current: next[id].base,
            lastLoss: 0,
            lastUpdatedAt: Date.now(),
          };
        }
        return next;
      });
    } catch (e) {
      alert("Failed to reset sanity");
    }
  }

  /* -----------------------------------------------------------
     RENDER
  ------------------------------------------------------------ */
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
      <div className="player-widget__header" onPointerDown={onDragStart}>
        <div className="player-widget__title">Players</div>

        <div className="player-widget__controls">
          {sanityEnabled && (
  <span
    className={`player-widget__icon ${sanityMode ? "active" : ""}`}
    onPointerDown={(e) => e.stopPropagation()}
    title="Sanity Mode"
    onClick={() => {
      const v = !sanityMode;
      setSanityMode(v);
      persistUI({ sanityMode: v });
    }}
  >
    <img
      src="/sanity.png"
      alt="Sanity"
      className="player-widget__sanity-icon"
      draggable={false}
    />
  </span>
)}

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

       {sanityEnabled && sanityMode && (
  <div className="player-widget__sanitybar" onPointerDown={(e) => e.stopPropagation()}>

    <div className="player-widget__sanitybar-actions">
      <button className="player-widget__sanbtn" disabled={!selectedIds.length} onClick={() => rollSanityForSelected("1d2")}>1D2</button>
      <button className="player-widget__sanbtn" disabled={!selectedIds.length} onClick={() => rollSanityForSelected("1d3")}>1D3</button>
      <button className="player-widget__sanbtn" disabled={!selectedIds.length} onClick={() => rollSanityForSelected("1d6")}>1D6</button>
      <button className="player-widget__sanbtn" disabled={!selectedIds.length} onClick={() => rollSanityForSelected("1d8")}>1D8</button>
      <button className="player-widget__sanbtn" disabled={!selectedIds.length} onClick={() => rollSanityForSelected("1d20")}>1D20</button>

     <button
  className="player-widget__sanbtn"
  title="Reset all sanity"
  onClick={resetAllSanity}
>
  <img
    src="/reset.png"
    alt="Reset"
    className="player-widget__reset-icon"
    draggable={false}
  />
</button>
    </div>

  </div>
)}

          <ul className={`player-widget__list ${layout}`}>
            {orderedPlayers.map((p, index) => {
              const off = inactive[p.id];
              const s = sanityState[p.id];
              const tone = computeSanTone(p.id);
              const flash = sanityFlash[p.id];

              return (
                <li key={p.id} className={`player-widget__player ${off ? "inactive" : ""}`}>
                  {flash && (
                    <div className={`player-widget__flash player-widget__flash--${flash.tone}`}>
                      <div className="player-widget__flash-top">{flash.textTop}</div>
                      <div className="player-widget__flash-bottom">{flash.textBottom}</div>
                    </div>
                  )}

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

                  {sanityEnabled && sanityMode && Number.isInteger(s?.base) && (
                    <div className={`player-widget__sanval player-widget__sanval--${tone}`}>
                      SAN {Number.isInteger(s?.current) ? s.current : s.base}
                    </div>
                  )}

                  <button
  className="player-widget__hidebtn"
  onPointerDown={(e) => e.stopPropagation()}
  title={off ? "Show player" : "Hide player"}
  onClick={() => {
    const n = { ...inactive, [p.id]: !off };
    setInactive(n);
    persistUI({ inactive: n });
  }}
>
  <img
    src={off ? "/unhide.png" : "/hide.png"}
    alt={off ? "Show" : "Hide"}
    className="player-widget__hide-icon"
    draggable={false}
  />
</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
