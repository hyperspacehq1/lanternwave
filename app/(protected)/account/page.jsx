"use client";

import { useEffect, useState, useRef } from "react";
import "./account.css";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState(null);

  const loadingRef = useRef(false); // 🔒 prevents double-loads

  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    async function loadAccount() {
      try {
        setLoading(true);

        const res = await fetch("/api/account", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const data = await res.json();

        if (!data?.ok || !data?.account?.username) {
          throw new Error("Invalid account response");
        }

        setUsername(data.account.username);
      } catch (err) {
        console.error("ACCOUNT PAGE LOAD ERROR:", err);
        setError("Unable to load account details.");
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    }

    loadAccount();
  }, []);

  return (
    <div className="account-page">
      <main className="account-content">
        <h1 className="account-title">My Account</h1>

        {/* Loading Skeleton */}
        {loading && !error && (
          <div className="account-panel account-skeleton">
            <div className="account-row">
              <span className="account-label skeleton-box" />
              <span className="account-value skeleton-box wide" />
            </div>
            <div className="account-row">
              <span className="account-label skeleton-box" />
              <span className="account-value skeleton-box" />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="account-error">
            {error}
          </div>
        )}

        {/* Loaded */}
        {!loading && !error && (
          <div className="account-panel">
            <div className="account-row">
              <span className="account-label">Username</span>
              <span className="account-value">{username}</span>
            </div>

            <div className="account-row">
              <span className="account-label">Plan</span>
              <span className="account-value">Observer</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
