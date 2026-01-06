"use client";

import { useEffect, useRef, useState } from "react";
import "./account.css";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState(null);

  // ✅ Server-backed Beacons (now via /api/account)
  const [beacons, setBeacons] = useState({});

  const loadingRef = useRef(false);

  /* ------------------------------
     Load account + beacons (single source)
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

        if (!accountRes.ok) throw new Error("Failed to load account");

        const accountData = await accountRes.json();
        if (!accountData?.account?.username) {
          throw new Error("Invalid account response");
        }

        setUsername(accountData.account.username);

        // ✅ beacons now come from /api/account
        setBeacons(accountData?.account?.beacons ?? {});
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
     Update Beacon (server-authoritative)
  ------------------------------ */
  const updateBeacon = async (key, enabled) => {
    // Optional optimistic UI (keeps UI snappy), but we ALWAYS reconcile with server response.
    setBeacons((prev) => ({ ...prev, [key]: enabled }));

    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled }),
      });

      if (!res.ok) {
        throw new Error("Beacon update failed");
      }

      const data = await res.json();

      // ✅ Server is source of truth — lock state to returned beacons
      setBeacons(data?.beacons ?? {});
    } catch (err) {
      console.error("Beacon update failed:", err);

      // Revert optimistic update by reloading account beacons
      try {
        const accountRes = await fetch("/api/account", {
          credentials: "include",
          cache: "no-store",
        });
        if (accountRes.ok) {
          const accountData = await accountRes.json();
          setBeacons(accountData?.account?.beacons ?? {});
        }
      } catch {
        // ignore
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
                      checked={!!beacons.player_characters}
                      onChange={(e) =>
                        updateBeacon("player_characters", e.target.checked)
                      }
                    />
                  </span>
                  Activate GM Dashboard Player Characters
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
