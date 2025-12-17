"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import "./account.css";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState(null);

  useEffect(() => {
    async function loadAccount() {
      try {
        const res = await fetch("/api/debug/account", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to load account");
        }

        const data = await res.json();

        if (!data?.ok || !data?.debug?.auth?.username) {
          throw new Error("Invalid account data");
        }

        setUsername(data.debug.auth.username);
      } catch (err) {
        setError("Unable to load account details.");
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, []);

  return (
    <div className="account-page">
      <main className="account-content">
        <h1 className="account-title">My Account</h1>

        {loading && <div className="account-status">Loading…</div>}

        {error && <div className="account-error">{error}</div>}

        {!loading && !error && (
          <div className="account-card">
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

      <Footer />
    </div>
  );
}
