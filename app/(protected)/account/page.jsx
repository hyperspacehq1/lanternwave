"use client";

import { useEffect, useState, useRef } from "react";
import "./account.css";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState(null);

  // Widget state (local only)
  const [widgets, setWidgets] = useState({});

  const loadingRef = useRef(false);

  // ------------------------------
  // Load account info
  // ------------------------------
  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    async function loadAccount() {
      try {
        const res = await fetch("/api/account", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to load account");

        const data = await res.json();
        if (!data?.account?.username) throw new Error("Invalid account");

        setUsername(data.account.username);
      } catch (err) {
        console.error("ACCOUNT LOAD ERROR:", err);
        setError("Unable to load account details.");
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, []);

  // ------------------------------
  // Load widget preferences (local only)
  // ------------------------------
  useEffect(() => {
    try {
      const stored = localStorage.getItem("widgets");
      if (stored) setWidgets(JSON.parse(stored));
    } catch {
      setWidgets({});
    }
  }, []);

  // ------------------------------
  // Update widget preferences
  // ------------------------------
  const updateWidget = (key, enabled) => {
    setWidgets((prev) => {
      const next = { ...prev, [key]: enabled };
      localStorage.setItem("widgets", JSON.stringify(next));
      return next;
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
              <span className="account-value skeleton-box" />
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="account-panel">
              <div className="account-row">
                <span className="account-label">Username</span>
                <span className="account-value">{username}</span>
              </div>
            </div>

            {/* Widget Preferences */}
            <div className="account-panel beacons-panel">
              <h2 className="account-section-title beacons-title">Beacons</h2>

              <div className="account-row">
                <label className="account-label">
                  <input
                    type="checkbox"
                    checked={!!widgets.player_characters}
                    onChange={(e) =>
                      updateWidget("player_characters", e.target.checked)
                    }
                  />
                  Player Characters
                </label>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
