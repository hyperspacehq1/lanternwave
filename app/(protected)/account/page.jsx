"use client";

import { useEffect, useRef, useState } from "react";
import "./account.css";
import { PLANS, getCurrentPlan } from "@/lib/plans";
import Tooltip from "@/components/Tooltip";
import { TOOLTIPS } from "@/lib/tooltips";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState(null);

  const [beacons, setBeacons] = useState({});
  const [plan, setPlan] = useState("observer");
  const [campaignCount, setCampaignCount] = useState(null);
  const [usedBytes, setUsedBytes] = useState(null);

  const loadingRef = useRef(false);

  /* ------------------------------
     Load account
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
        if (!accountData?.account?.username)
          throw new Error("Invalid account response");

        setUsername(accountData.account.username);
        setBeacons(accountData.account.beacons ?? {});
        setPlan(getCurrentPlan());
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
     Load campaign usage (live)
  ------------------------------ */
  useEffect(() => {
    async function loadCampaigns() {
      try {
        const res = await fetch("/api/campaigns", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const rows = await res.json();
        setCampaignCount(Array.isArray(rows) ? rows.length : 0);
      } catch {
        /* ignore */
      }
    }

    loadCampaigns();
  }, []);

  /* ------------------------------
     Load storage usage (read-only)
  ------------------------------ */
  useEffect(() => {
    async function loadUsage() {
      try {
        const res = await fetch("/api/r2/usage", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.usedBytes === "number") {
          setUsedBytes(data.usedBytes);
        }
      } catch {
        /* ignore */
      }
    }

    loadUsage();
  }, []);

  /* ------------------------------
     Update Beacon (optimistic)
  ------------------------------ */
  const updateBeacon = (key, enabled) => {
    setBeacons((prev) => ({ ...prev, [key]: enabled }));

    fetch("/api/account", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled }),
    }).catch(() => {});
  };

  const planDef = PLANS[plan];

  const formatGB = (bytes) =>
    (bytes / (1024 * 1024 * 1024)).toFixed(1);

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

            {/* ---------------- Plan & Limits ---------------- */}
            <h2 className="account-section-title">Plan & Limits</h2>

            <div className="account-panel">
              <div className="account-row">
                <div>
                  <div className="account-label">
                    {plan.toUpperCase()} (Current)
                  </div>

                  <div className="account-status">
                    Campaigns:{" "}
                    {campaignCount !== null
                      ? `${campaignCount} / ${planDef.maxCampaigns}`
                      : `— / ${planDef.maxCampaigns}`}
                    <br />
                    Storage:{" "}
                    {usedBytes !== null
                      ? `${formatGB(usedBytes)} / ${formatGB(
                          planDef.storageLimitBytes
                        )} GB`
                      : `${formatGB(planDef.storageLimitBytes)} GB`}
                  </div>
                </div>

                <button
                  className="account-action"
                  disabled
                  title="Upgrades not available yet"
                >
                  Upgrade
                </button>
              </div>
            </div>

            {/* ---------------- Security ---------------- */}
            <h2 className="account-section-title">Security</h2>

            <div className="account-panel">
              <div className="account-row">
                <span className="account-label">Password</span>

                <button
                  className="account-action"
                  onClick={() => {
                    setShowPasswordForm((v) => !v);
                    setPasswordStatus(null);
                  }}
                >
                  Change Password
                </button>
              </div>

              {showPasswordForm && (
                <form
                  className="account-password-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setPasswordStatus("Saving…");

                    const form = new FormData(e.currentTarget);

                    const res = await fetch("/api/account/password", {
                      method: "PUT",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        currentPassword: form.get("currentPassword"),
                        newPassword: form.get("newPassword"),
                      }),
                    });

                    if (res.status === 401) {
                      window.location.href = "/login";
                      return;
                    }

                    const data = await res.json();

                    if (!res.ok) {
                      setPasswordStatus(
                        data?.error || "Password update failed."
                      );
                      return;
                    }

                    setPasswordStatus("Password updated successfully.");
                    e.currentTarget.reset();
                  }}
                >
                  <input
                    type="password"
                    name="currentPassword"
                    placeholder="Current password"
                    required
                  />

                  <input
                    type="password"
                    name="newPassword"
                    placeholder="New password"
                    minLength={8}
                    required
                  />

                  <button type="submit" className="account-action">
  Update Password
</button>

                  {passwordStatus && (
                    <div className="account-status">{passwordStatus}</div>
                  )}
                </form>
              )}
            </div>

            {/* ---------------- Beacons ---------------- */}
            <h2 className="account-section-title">Beacons</h2>

            <div className="account-panel beacons-panel">
              {[
  ["player_characters", "Player Characters Beacon (GM Dashboard)"],
  ["npc_pulse", "NPC Pulse Beacon (GM Dashboard)"],
  [
    "player_sanity_tracker",
    "Player Sanity Tracker (GM Dashboard)",
  ],
].map(([key, label]) => (
  <div className="account-row" key={key}>
    <label className="account-label">
      <span className="beacon-checkbox">
        <input
          type="checkbox"
          checked={!!beacons[key]}
          onChange={(e) =>
            updateBeacon(key, e.target.checked)
          }
        />
      </span>

      <Tooltip content={TOOLTIPS.account[key]}>
        {label}
      </Tooltip>
    </label>
  </div>
))}
            </div>
          </>
        )}

        {error && <div className="account-error">{error}</div>}
      </main>
    </div>
  );
}
