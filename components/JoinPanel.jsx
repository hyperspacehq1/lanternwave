"use client";

import { useEffect, useState } from "react";

/* ----------------------------------------------------------
   Normalize API responses into arrays (defensive)
---------------------------------------------------------- */
function normalizeArrayResponse(data) {
  if (Array.isArray(data)) return data;

  if (data?.rows && Array.isArray(data.rows)) return data.rows;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.players && Array.isArray(data.players)) return data.players;

  return [];
}

export default function JoinPanel({
  title,
  encounterId,
  sessionId,
  locationId,
  campaignId,
  joinPath,
  idField,
  labelField = "name",
}) {
  const [attached, setAttached] = useState([]);
  const [available, setAvailable] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);

  /* ----------------------------------------------------------
     Resolve scope
  ---------------------------------------------------------- */
  const scopeId = encounterId || sessionId || locationId;
  const scopeType = encounterId
    ? "encounters"
    : sessionId
    ? "sessions"
    : "locations";

  if (!scopeId) return null;

  /* ----------------------------------------------------------
     Guard allowed joins
  ---------------------------------------------------------- */
  const VALID_ENCOUNTER_JOINS = new Set(["npcs", "sessions"]);

  const VALID_SESSION_JOINS = new Set([
  "encounters",
  "events",
  "locations",
  "items", // ✅ ADD
   ]);

  const VALID_LOCATION_JOINS = new Set(["items"]);

  if (
    (scopeType === "encounters" && !VALID_ENCOUNTER_JOINS.has(joinPath)) ||
    (scopeType === "sessions" && !VALID_SESSION_JOINS.has(joinPath)) ||
    (scopeType === "locations" && !VALID_LOCATION_JOINS.has(joinPath))
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
  } else if (scopeType === "sessions" && joinPath === "encounters") {
    baseUrl = `/api/sessions-encounters?session_id=${scopeId}`;
  } else if (scopeType === "sessions" && joinPath === "events") {
    baseUrl = `/api/sessions-events?session_id=${scopeId}`;
  } else if (scopeType === "sessions" && joinPath === "locations") {
    baseUrl = `/api/sessions-locations?session_id=${scopeId}`;

  } else if (scopeType === "sessions" && joinPath === "items") {
    baseUrl = `/api/sessions-items?session_id=${scopeId}`;

  } else if (scopeType === "locations" && joinPath === "items") {
    baseUrl = `/api/locations-items?location_id=${scopeId}`;
  } else {
    baseUrl = `/api/${scopeType}/${scopeId}/${joinPath}`;
  }

  /* ----------------------------------------------------------
     Load attached
  ---------------------------------------------------------- */
  useEffect(() => {
    fetch(baseUrl, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setAttached(normalizeArrayResponse(data));
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
        const list = normalizeArrayResponse(data);

        const attachedIds = new Set(
          attached.map((r) => r[idField])
        );

        setAvailable(
          list.filter((r) => !attachedIds.has(r[idField] ?? r.id))
        );
      })
      .catch(() => setAvailable([]));
  }, [campaignId, joinPath, attached, idField]);

  /* ----------------------------------------------------------
     Attach
  ---------------------------------------------------------- */
  async function attach() {
    if (!selectedId) return;

    setLoading(true);
    try {
      const isEncounterNpcs =
        scopeType === "encounters" && joinPath === "npcs";
      const isSessionEncounters =
        scopeType === "sessions" && joinPath === "encounters";
      const isSessionEvents =
        scopeType === "sessions" && joinPath === "events";
      const isSessionLocations =
        scopeType === "sessions" && joinPath === "locations";
      const isLocationItems =
        scopeType === "locations" && joinPath === "items";

      const postUrl = isEncounterNpcs
        ? "/api/encounters-npcs"
        : isSessionEncounters
        ? "/api/sessions-encounters"
        : isSessionEvents
        ? "/api/sessions-events"
        : isSessionLocations
        ? "/api/sessions-locations"
        : isSessionItems
        ? "/api/sessions-items"

        : isLocationItems
        ? "/api/locations-items"
        : baseUrl;

      const payload = isEncounterNpcs
        ? { encounter_id: scopeId, npc_id: selectedId }
        : isSessionEncounters
        ? { session_id: scopeId, encounter_id: selectedId }
        : isSessionEvents
        ? { session_id: scopeId, event_id: selectedId }
        : isSessionLocations
        ? { session_id: scopeId, location_id: selectedId }

        : isSessionItems
        ? { session_id: scopeId, item_id: selectedId }

        : isLocationItems
        ? { location_id: scopeId, item_id: selectedId }
        : { [idField]: selectedId };

      const res = await fetch(postUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) return;

      const refreshed = await fetch(baseUrl, {
        credentials: "include",
      }).then((r) => (r.ok ? r.json() : []));

      setAttached(normalizeArrayResponse(refreshed));
    } finally {
      setSelectedId("");
      setLoading(false);
    }
  }

  /* ----------------------------------------------------------
     Detach
  ---------------------------------------------------------- */
  async function detach(row) {
    const id = row && typeof row === "object" ? row[idField] : row;

    const isEncounterNpcs =
      scopeType === "encounters" && joinPath === "npcs";
    const isSessionEncounters =
      scopeType === "sessions" && joinPath === "encounters";
    const isSessionEvents =
      scopeType === "sessions" && joinPath === "events";
    const isSessionLocations =
      scopeType === "sessions" && joinPath === "locations";

    const isSessionItems =
      scopeType === "sessions" && joinPath === "items";

    const isLocationItems =
      scopeType === "locations" && joinPath === "items";

    const deleteUrl = isEncounterNpcs
      ? "/api/encounters-npcs"
      : isSessionEncounters
      ? "/api/sessions-encounters"
      : isSessionEvents
      ? "/api/sessions-events"
      : isSessionLocations
      ? "/api/sessions-locations"

      : isSessionItems
      ? "/api/sessions-items"

      : isLocationItems
      ? "/api/locations-items"
      : baseUrl;

    const payload = isEncounterNpcs
      ? { encounter_id: scopeId, npc_id: id }
      : isSessionEncounters
      ? { session_id: scopeId, encounter_id: id }
      : isSessionEvents
      ? { session_id: scopeId, event_id: id }
      : isSessionLocations
      ? { session_id: scopeId, location_id: id }

      : isSessionItems
      ? { session_id: scopeId, item_id: id }


      : isLocationItems
      ? { location_id: scopeId, item_id: id }
      : { [idField]: id };

    const res = await fetch(deleteUrl, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return;

    setAttached((prev) =>
      prev.filter((r) => r[idField] !== id)
    );
  }

  return (
    <div className="cm-join-panel">
      <h3 className="cm-join-title">{title}</h3>

      <ul className="cm-join-list">
        {attached.map((r) => (
          <li key={r[idField]} className="cm-join-row">
            <span className="cm-join-name">{r[labelField]}</span>
            <button
  className="cm-btn cm-join-remove danger"
  onClick={() => detach(r)}
>
  Remove
</button>
          </li>
        ))}

        {attached.length === 0 && (
          <li className="cm-muted">None</li>
        )}
      </ul>

      <div className="cm-join-controls">
        <select
          className="cm-join-select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">Add existing…</option>
          {available.map((r) => (
            <option
              key={r.id ?? r[idField]}
              value={r.id ?? r[idField]}
            >
              {r[labelField]}
            </option>
          ))}
        </select>

        <button
          className="cm-button cm-join-add"
          disabled={!selectedId || loading}
          onClick={attach}
        >
          {scopeType === "sessions"
            ? "Link to Session"
            : scopeType === "locations"
            ? "Link to Location"
            : "Link to Encounter"}
        </button>
      </div>
    </div>
  );
}
