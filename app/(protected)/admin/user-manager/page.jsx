"use client";

import { useEffect, useState } from "react";
import "../database-manager/database-manager.css";
import "./user-manager.css";

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
    <div className="um-modal-overlay">
      <div className="um-modal">
        <p>{message}</p>
        <div className="um-modal-actions">
          <button type="button" className="um-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="um-btn-confirm-delete"
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
      const res = await fetch("/api/admin/user-manager", {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.ok) {
        setUsers(data.users || []);
      } else {
        setError(data?.error || "Failed to load users");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(userId, tenantId) {
    setLoading(true);
    try {
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

          <div className="um-header-actions">
            <div className="flex items-center gap-2">
              <span className="um-online-dot" />
              <span className="text-sm text-white/60">
                {onlineCount} online
              </span>
            </div>
            <button
              type="button"
              className="um-btn"
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
            className="um-search"
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
          <table className="um-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Tenant ID</th>
                <th>User ID</th>
                <th className="text-center">AI Usage</th>
                <th className="text-center">Status</th>
                <th className="text-right">Actions</th>
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
                <tr key={u.user_id}>
                  <td className="font-medium">{u.username}</td>
                  <td className="text-white/70">{u.email}</td>
                  <td className="mono">{u.tenant_id}</td>
                  <td className="mono">{u.user_id}</td>
                  <td className="text-center">
                    <span className="um-usage-pill">
                      {u.ai_usage_count ?? 0}
                    </span>
                  </td>
                  <td className="text-center">
                    <Badge status={u.is_online ? "green" : "yellow"} />
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="um-btn-delete"
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
