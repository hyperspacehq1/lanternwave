"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./PlayerCharactersWidget.css";

export default function PlayerCharactersWidget({ campaignId }) {
  const widgetRef = useRef(null);

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [collapsed, setCollapsed] = useState(false);
  const [inactive, setInactive] = useState({});
  const [turns, setTurns] = useState({});
  const [order, setOrder] = useState([]);

  const [sanityEnabled, setSanityEnabled] = useState(false);
  const [sanityMode, setSanityMode] = useState(true);

  const [sanityState, setSanityState] = useState({});
  const [sanityFlash, setSanityFlash] = useState({});

  /* ------------------------------
     Load account beacons
  ------------------------------ */
  useEffect(() => {
    fetch("/api/account", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setSanityEnabled(!!d?.account?.beacons?.player_sanity_tracker);
      })
      .catch(() => setSanityEnabled(false));
  }, []);

  /* ------------------------------
     Load players
  ------------------------------ */
  useEffect(() => {
    if (!campaignId) return;
    setLoading(true);

    fetch(`/api/players?campaign_id=${campaignId}`)
      .then((r) => r.json())
      .then((list) => {
        setPlayers(list);
        setOrder(list.map((p) => p.id));

        const map = {};
        for (const p of list) {
          if (Number.isInteger(p.sanity)) {
            map[p.id] = {
              base: p.sanity,
              current: p.sanity,
              lastLoss: 0,
            };
          }
        }
        setSanityState(map);
      })
      .finally(() => setLoading(false));
  }, [campaignId]);

  const selectedIds = useMemo(
    () => Object.keys(turns).filter((id) => turns[id]),
    [turns]
  );

  function rollSanityForSelected(type) {
    selectedIds.forEach(async (playerId) => {
      const res = await fetch("/api/sanity/roll", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          player_id: playerId,
          roll_type: type,
        }),
      });

      const data = await res.json();
      if (!res.ok) return;

      setSanityState((prev) => ({
        ...prev,
        [playerId]: {
          base: data.base_sanity,
          current: data.current_sanity,
          lastLoss: data.sanity_loss,
        },
      }));

      if (data.sanity_loss > 0) {
        setSanityFlash((prev) => ({
          ...prev,
          [playerId]: Date.now(),
        }));

        setTimeout(() => {
          setSanityFlash((prev) => {
            const next = { ...prev };
            delete next[playerId];
            return next;
          });
        }, 2000);
      }
    });
  }

  function sanTone(p) {
    const s = sanityState[p.id];
    if (!s) return "muted";
    if (s.lastLoss >= 5) return "yellow";
    if (s.current / s.base >= 0.8) return "green";
    return "red";
  }

  return (
    <div className="player-widget" ref={widgetRef}>
      <div className="player-widget__header">
        <div className="player-widget__title">
          Players <span className="player-widget__version">V.1</span>
        </div>

        <div className="player-widget__controls">
          {sanityEnabled && (
            <span
              className={`player-widget__icon ${sanityMode ? "active" : ""}`}
              onClick={() => setSanityMode((v) => !v)}
            >
              🧠
            </span>
          )}
          <span
            className="player-widget__icon"
            onClick={() => setCollapsed((v) => !v)}
          >
            ▾
          </span>
        </div>
      </div>

      {!collapsed && (
        <div className="player-widget__body">
          {sanityEnabled && sanityMode && (
            <div className="player-widget__sanitybar">
              <div className="player-widget__sanitylabel">Sanity</div>

              <div className="player-widget__sanitybar-actions">
                <button
                  className="player-widget__sanbtn"
                  disabled={!selectedIds.length}
                  onClick={() => rollSanityForSelected("0/1")}
                >
                  0 / 1
                </button>
                <button
                  className="player-widget__sanbtn"
                  disabled={!selectedIds.length}
                  onClick={() => rollSanityForSelected("1d6")}
                >
                  1D6
                </button>
                <button
                  className="player-widget__sanbtn"
                  disabled={!selectedIds.length}
                  onClick={() => rollSanityForSelected("1d10")}
                >
                  1D10
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div>Loading…</div>
          ) : (
            <ul className="player-widget__list vertical">
              {players.map((p) => (
                <li
                  key={p.id}
                  className={`player-widget__player ${
                    inactive[p.id] ? "inactive" : ""
                  }`}
                >
                  {sanityFlash[p.id] && (
                    <div className={`player-widget__flash player-widget__flash--${sanTone(p)}`}>
                      <div>
                        <div className="player-widget__flash-top">Sanity</div>
                        <div className="player-widget__flash-bottom">
                          SAN {sanityState[p.id]?.current}
                        </div>
                      </div>
                    </div>
                  )}

                  <input
                    type="checkbox"
                    className="player-widget__checkbox"
                    checked={!!turns[p.id]}
                    onChange={() =>
                      setTurns((t) => ({ ...t, [p.id]: !t[p.id] }))
                    }
                  />

                  <div className="player-widget__text">
                    <div className="player-widget__character">
                      {p.character_name}
                    </div>
                    <div className="player-widget__name">{p.first_name}</div>
                  </div>

                  {sanityEnabled && sanityMode && (
                    <div
                      className={`player-widget__sanval player-widget__sanval--${sanTone(
                        p
                      )}`}
                    >
                      SAN {sanityState[p.id]?.current}
                    </div>
                  )}

                  <button
                    className="player-widget__hidebtn"
                    onClick={() =>
                      setInactive((i) => ({ ...i, [p.id]: !i[p.id] }))
                    }
                  >
                    👁
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
