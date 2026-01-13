"use client";

import { useEffect, useState } from "react";

export default function JoinPanel({
  title,
  encounterId,
  sessionId,
  campaignId,
  joinPath,          // e.g. "npcs" | "items" | "locations" | "events" | "encounters"
  idField,           // npc_id | item_id | location_id | event_id | encounter_id
  labelField = "name"
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

  /* ----------------------------------------------------------
     Build base URL (CRITICAL FIX)
  ---------------------------------------------------------- */
  const baseUrl =
    scopeType === "sessions"
      ? `/api/sessions/${joinPath}?session_id=${scopeId}`
      : `/api/${scopeType}/${scopeId}/${joinPath}`;

  /* ----------------------------------------------------------
     Load attached (scope scoped)
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!scopeId) return;

    fetch(baseUrl, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAttached(data);
        } else {
          console.warn(
            `JoinPanel (${joinPath}) attached returned non-array:`,
            data
          );
          setAttached([]);
        }
      })
      .catch((err) => {
        console.error(
          `JoinPanel (${joinPath}) attached fetch failed:`,
          err
        );
        setAttached([]);
      });
  }, [baseUrl, joinPath, scopeId]);

  /* ----------------------------------------------------------
     Load available (campaign scoped)
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!campaignId) return;

    fetch(`/api/${joinPath}?campaign_id=${campaignId}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAvailable(data);
        } else {
          console.warn(
            `JoinPanel (${joinPath}) available returned non-array:`,
            data
          );
          setAvailable([]);
        }
      })
      .catch((err) => {
        console.error(
          `JoinPanel (${joinPath}) available fetch failed:`,
          err
        );
        setAvailable([]);
      });
  }, [campaignId, joinPath]);

  /* ----------------------------------------------------------
     Attach
  ---------------------------------------------------------- */
  async function attach() {
    if (!selectedId || !scopeId) return;

    setLoading(true);

    try {
      await fetch(baseUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [idField]: selectedId }),
      });

      const refreshed = await fetch(baseUrl, {
        credentials: "include",
      }).then((r) => r.json());

      setAttached(Array.isArray(refreshed) ? refreshed : []);
    } catch (err) {
      console.error(`JoinPanel (${joinPath}) attach failed:`, err);
    } finally {
      setSelectedId("");
      setLoading(false);
    }
  }

  /* ----------------------------------------------------------
     Detach
  ---------------------------------------------------------- */
  async function detach(id) {
    if (!scopeId) return;

    try {
      await fetch(baseUrl, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [idField]: id }),
      });

      setAttached((prev) =>
        Array.isArray(prev)
          ? prev.filter((r) => r[idField] !== id)
          : []
      );
    } catch (err) {
      console.error(`JoinPanel (${joinPath}) detach failed:`, err);
    }
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
