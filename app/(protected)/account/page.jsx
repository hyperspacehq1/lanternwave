"use client";

import { useEffect, useRef, useState } from "react";
import "./account.css";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState(null);

  // Server-backed Beacons
  const [beacons, setBeacons] = useState({});

  const loadingRef = useRef(false);

  /* ------------------------------
     Load account + beacons
  ------------------------------ */
  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    async function load() {
      console.log("🧪 ACCOUNT LOAD START");

      try {
        const accountRes = await fetch("/api/account", {
          credentials: "include",
          cache: "no-store",
        });

        console.log("🧪 ACCOUNT LOAD RESPONSE", {
          status: accountRes.status,
          ok: accountRes.ok,
        });

        if (!accountRes.ok) throw new Error("Failed to load account");

        const accountData = await accountRes.json();

        console.log("🧪 ACCOUNT LOAD DATA", accountData);

        if (!accountData?.account?.username) {
          throw new Error("Invalid account response");
        }

        setUsername(accountData.account.username);
        setBeacons(accountData?.account?.beacons ?? {});
      } catch (err) {
        console.error("❌ ACCOUNT LOAD ERROR", err);
        setError("Unable to load account details.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  /* ------------------------------
     Update Beacon (debug-heavy)
  ------------------------------ */
  const updateBeacon = async (key, enabled) => {
    const debugId = `beacon:${key}:${Date.now()}`;

    console.log("➡️ BEACON UPDATE START", {
      debugId,
      key,
      enabled,
      prevValue: beacons[key],
    });

    // Optimistic UI (unchanged behavior)
    setBeacons((prev) => ({ ...prev, [key]: enabled }));

    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled }),
      });

      console.log("⬅️ BEACON UPDATE RESPONSE", {
        debugId,
        status: res.status,
        ok: res.ok,
      });

      if (!res.ok) {
        throw new Error("Beacon update failed");
      }

      const data = await res.json();

      console.log("📦 BEACON UPDATE DATA", {
        debugId,
        data,
      });

      // Server is source of truth
      setBeacons(data?.beacons ?? {});
    } catch (err) {
      console.error("❌ BEACON UPDATE FAILED", {
        debugId,
        key,
        enabled,
        err,
      });

      // Reconcile by reloading account state
      try {
        console.log("🔄 RELOADING ACCOUNT AFTER FAILURE", { debugId });

        const accountRes = await fetch("/api/account", {
          credentials: "include",
          cache: "no-store",
        });

        if (accountRes.ok) {
          const accountData = await accountRes.json();

          console.log("🔄 RELOAD ACCOUNT DATA", {
            debugId,
            beacons: accountData?.account?.beacons,
          });

          setBeacons(accountData?.account?.beacons ?? {});
        }
      } catch (reloadErr) {
        console.error("❌ ACCOUNT RELOAD FAILED", reloadErr);
      }
    }
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
                      data-debug-id="beacon:player_characters"
                      checked={!!beacons.player_characters}
                      onChange={(e) => {
                        console.log("🧪 TOGGLE CLICK", {
                          debugId: "beacon:player_characters",
                          next: e.target.checked,
                          prev: beacons.player_characters,
                        });

                        updateBeacon(
                          "player_characters",
                          e.target.checked
                        );
                      }}
                    />
                  </span>
                  Activate GM Dashboard Player Characters
                </label>
              </div>

              {/* ---------- Visible Debug ---------- */}
              <div className="beacon-debug">
                <code>
                  key=player_characters | checked=
                  {String(!!beacons.player_characters)}
                </code>
              </div>
            </div>
          </>
        )}

        {error && <div className="account-error">{error}</div>}
      </main>
    </div>
  );
}
