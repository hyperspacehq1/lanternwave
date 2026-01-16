"use client";

import { useEffect, useRef, useState } from "react";
import "./account.css";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState(null);

  // Server-backed beacons
  const [beacons, setBeacons] = useState({});

  const loadingRef = useRef(false);

  /* ------------------------------
     Load account + beacons
  ------------------------------ */
  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    async function load() {
      try {
        const accountRes = await fetch("/api/account", {
          credentials: "include",
          cache: "no-store",
        });

        if (!accountRes.ok) {
          throw new Error("Failed to load account");
        }

        const accountData = await accountRes.json();

        if (!accountData?.account?.username) {
          throw new Error("Invalid account response");
        }

        setUsername(accountData.account.username);
        setBeacons(accountData.account.beacons ?? {});
      } catch (err) {
        console.error("ACCOUNT LOAD ERROR:", err);
        setError("Unable to load account details.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  /* ------------------------------
     Mirror sanity beacon → localStorage
     (widget listens to this)
  ------------------------------ */
  useEffect(() => {
    if (!username) return;

    const key = `lw:feature:${username}:player_sanity_tracker`;

    try {
      if (beacons.player_sanity_tracker) {
        localStorage.setItem(key, "1");
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      /* ignore */
    }
  }, [beacons.player_sanity_tracker, username]);

  /* ------------------------------
     Update Beacon (optimistic)
  ------------------------------ */
  const updateBeacon = (key, enabled) => {
    // Optimistic UI
    setBeacons((prev) => ({ ...prev, [key]: enabled }));

    fetch("/api/account", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled }),
    }).catch((err) => {
      console.error("Beacon update failed:", err);
    });
  };

  return (
    <div className="account-page">
      <main className="account-content">
        <h1 className="account-title">My Account</h1>

        {loading && (
          <div className="account-panel account-skeleton">
            <div className="account-row">
              <span className="account-label skeleton-box" />
              <span className="account-value skeleton-box wide" />
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ---------------- Account ---------------- */}
            <div className="account-panel">
              <div className="account-row">
                <span className="account-label">Username</span>
                <span className="account-value">{username}</span>
              </div>
            </div>

            {/* ---------------- Beacons ---------------- */}
            <h2 className="account-section-title">Beacons</h2>
            <div className="account-panel beacons-panel">

              <div className="account-row">
                <label className="account-label">
                  <span className="beacon-checkbox">
                    <input
                      type="checkbox"
                      checked={!!beacons.player_characters}
                      onChange={(e) =>
                        updateBeacon("player_characters", e.target.checked)
                      }
                    />
                  </span>
                  Player Characters Beacon (GM Dashboard)
                </label>
              </div>

              <div className="account-row">
                <label className="account-label">
                  <span className="beacon-checkbox">
                    <input
                      type="checkbox"
                      checked={!!beacons.npc_pulse}
                      onChange={(e) =>
                        updateBeacon("npc_pulse", e.target.checked)
                      }
                    />
                  </span>
                  NPC Pulse Beacon (GM Dashboard)
                </label>
              </div>

              {/* 🧠 NEW SANITY BEACON */}
              <div className="account-row">
                <label className="account-label">
                  <span className="beacon-checkbox">
                    <input
                      type="checkbox"
                      checked={!!beacons.player_sanity_tracker}
                      onChange={(e) =>
                        updateBeacon(
                          "player_sanity_tracker",
                          e.target.checked
                        )
                      }
                    />
                  </span>
                  Player Sanity Tracker (GM Dashboard)
                </label>
              </div>

            </div>
          </>
        )}

        {error && <div className="account-error">{error}</div>}
      </main>
    </div>
  );
}
