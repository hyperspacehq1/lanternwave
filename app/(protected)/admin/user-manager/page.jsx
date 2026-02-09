"use client";

import { useEffect, useState } from "react";
import "../database-manager/database-manager.css";

/* ---------- UI primitives ---------- */

function Badge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs rounded status-${status}`}>
      {status.toUpperCase()}
    </span>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="rounded-xl border border-white/15 bg-neutral-900 p-6 max-w-md w-full shadow-xl space-y-4">
        <p className="text-sm">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-sm"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-sm text-white"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function UserManagerPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      console.log("[user-manager] Fetching users...");
      const res = await fetch("/api/admin/user-manager", {
        cache: "no-store",
      });
      console.log("[user-manager] Response status:", res.status);
      const data = await res.json();
      console.log("[user-manager] Response data:", data);
      if (data?.ok) {
        setUsers(data.users || []);
      } else {
        setError(data?.error || "Failed to load users");
      }
    } catch (err) {
      console.error("[user-manager] Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(userId, tenantId) {
    setLoading(true);
    try {
      console.log("[user-manager] Deleting user:", userId);
      const res = await fetch("/api/admin/user-manager", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, tenant_id: tenantId }),
      });
      const data = await res.json();
      if (!data?.ok) {
        alert(data?.error || "Delete failed");
      }
      await loadUsers();
    } finally {
      setLoading(false);
      setDeleteTarget(null);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.username || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.user_id || "").toLowerCase().includes(q) ||
      (u.tenant_id || "").toLowerCase().includes(q)
    );
  });

  const onlineCount = users.filter((u) => u.is_online).length;

  return (
    <div className="db-manager space-y-6">
      <div className="db-manager__content">
        {/* Confirm modal */}
        {deleteTarget && (
          <ConfirmModal
            message={`Delete user "${deleteTarget.username}" and tenant ${deleteTarget.tenant_id}? This will remove all associated records (sessions, AI usage, etc.).`}
            onConfirm={() =>
              deleteUser(deleteTarget.user_id, deleteTarget.tenant_id)
            }
            onCancel={() => setDeleteTarget(null)}
          />
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">User Manager</h1>
            <div className="text-sm text-white/60 mt-1">
              View, search, and manage all users
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-white/60">
                {onlineCount} online
              </span>
            </div>
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-sm"
              onClick={loadUsers}
              disabled={loading}
            >
              {loading ? "Loading\u2026" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="rounded-xl p-4 status-red">
            <div className="text-sm font-semibold">Error</div>
            <div className="text-xs mt-1 opacity-80">{error}</div>
          </div>
        )}

        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search by username, email, user ID, or tenant ID\u2026"
            className="w-full md:w-96 px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Summary */}
        <div className="text-sm text-white/50">
          {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          {search ? ` matching "${search}"` : ""}
        </div>

        {/* Users table */}
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-white/50 uppercase tracking-wider">
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Tenant ID</th>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3 text-center">AI Usage</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-white/40"
                  >
                    {loading ? "Loading\u2026" : "No users found."}
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
                <tr
                  key={u.user_id}
                  className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-white/70">{u.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-white/50">
                    {u.tenant_id}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-white/50">
                    {u.user_id}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-1 text-xs rounded bg-white/5 border border-white/10">
                      {u.ai_usage_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge status={u.is_online ? "green" : "yellow"} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 transition-colors"
                      onClick={() => setDeleteTarget(u)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
