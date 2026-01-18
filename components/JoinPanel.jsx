"use client";

import { useEffect, useState } from "react";

export default function JoinPanel({
  title,
  encounterId,
  sessionId,
  campaignId,
  joinPath,          // "npcs" | "sessions" | "encounters"
  idField,           // npc_id | session_id | encounter_id
  labelField = "name",
}) {
  const [attached, setAttached] = useState([]);
  const [available, setAvailable] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);

  /* ----------------------------------------------------------
     Resolve scope (encounter OR session)
  ---------------------------------------------------------- */
  const scopeId = encounterId || sessionId;
  const scopeType = encounterId ? "encounters" : "sessions";

  if (!scopeId) return null;

  /* ----------------------------------------------------------
     Guard: allow ONLY valid joins per scope
  ---------------------------------------------------------- */
  const VALID_ENCOUNTER_JOINS = new Set(["npcs", "sessions"]);
  const VALID_SESSION_JOINS = new Set(["encounters"]);

  if (
    (scopeType === "encounters" && !VALID_ENCOUNTER_JOINS.has(joinPath)) ||
    (scopeType === "sessions" && !VALID_SESSION_JOINS.has(joinPath))
  ) {
    console.warn("JoinPanel: invalid joinPath for scope", {
      scopeType,
      joinPath,
    });
    return null;
  }

  /* ----------------------------------------------------------
     Build base URL
  ---------------------------------------------------------- */
  let baseUrl;

  if (scopeType === "encounters" && joinPath === "npcs") {
    baseUrl = `/api/encounters-npcs?encounter_id=${scopeId}`;
  } else if (scopeType === "sessions") {
    baseUrl = `/api/sessions/${joinPath}?session_id=${scopeId}`;
  } else {
    baseUrl = `/api/${scopeType}/${scopeId}/${joinPath}`;
  }

  /* ----------------------------------------------------------
     Load attached (scope-scoped)
  ---------------------------------------------------------- */
  useEffect(() => {
    fetch(baseUrl, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setAttached(Array.isArray(data) ? data : []);
      })
      .catch(() => setAttached([]));
  }, [baseUrl]);

  /* ----------------------------------------------------------
     Load available (campaign-scoped)
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!campaignId) return;

    fetch(`/api/${joinPath}?campaign_id=${campaignId}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setAvailable(Array.isArray(data) ? data : []);
      })
      .catch(() => setAvailable([]));
  }, [campaignId, joinPath]);

  /* ----------------------------------------------------------
     Attach
  ---------------------------------------------------------- */
  async function attach() {
    if (!selectedId) return;

    setLoading(true);
    try {
      const res = await fetch(
        joinPath === "npcs" && scopeType === "encounters"
          ? "/api/encounters-npcs"
          : baseUrl,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            [idField]: selectedId,
            ...(joinPath === "npcs" && scopeType === "encounters"
              ? { encounter_id: scopeId }
              : {}),
          }),
        }
      );

      if (!res.ok) {
        console.error("JoinPanel attach failed");
        return;
      }

      const refreshed = await fetch(baseUrl, {
        credentials: "include",
      }).then((r) => (r.ok ? r.json() : []));

      setAttached(Array.isArray(refreshed) ? refreshed : []);
    } finally {
      setSelectedId("");
      setLoading(false);
    }
  }

  /* ----------------------------------------------------------
     Detach
  ---------------------------------------------------------- */
  async function detach(id) {
    const res = await fetch(
      joinPath === "npcs" && scopeType === "encounters"
        ? "/api/encounters-npcs"
        : baseUrl,
      {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [idField]: id,
          ...(joinPath === "npcs" && scopeType === "encounters"
            ? { encounter_id: scopeId }
            : {}),
        }),
      }
    );

    if (!res.ok) {
      console.error("JoinPanel detach failed");
      return;
    }

    setAttached((prev) =>
      Array.isArray(prev)
        ? prev.filter((r) => r[idField] !== id)
        : []
    );
  }

  return (
    <div className="cm-join-panel">
      <h3>{title}</h3>

      <ul>
        {attached.map((r) => (
          <li key={r[idField]}>
            {r[labelField]}
            <button onClick={() => detach(r[idField])}>
              Remove
            </button>
          </li>
        ))}
        {attached.length === 0 && <li>None</li>}
      </ul>

      <div className="cm-join-add">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">Add existing…</option>
          {available.map((r) => (
            <option key={r.id} value={r.id}>
              {r[labelField]}
            </option>
          ))}
        </select>

        <button disabled={!selectedId || loading} onClick={attach}>
          Add
        </button>
      </div>
    </div>
  );
}
