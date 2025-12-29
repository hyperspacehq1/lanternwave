"use client";

import { useEffect, useState } from "react";

export default function JoinPanel({
  title,
  encounterId,
  campaignId,
  joinPath,          // "npcs" | "items" | "locations"
  idField,           // npc_id | item_id | location_id
  labelField = "name"
}) {
  const [attached, setAttached] = useState([]);
  const [available, setAvailable] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);

  /* ----------------------------------------------------------
     Load attached records
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!encounterId) return;

    const controller = new AbortController();

    fetch(`/api/encounters/${encounterId}/${joinPath}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAttached(data);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [encounterId, joinPath]);

  /* ----------------------------------------------------------
     Load available records (campaign scoped)
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!campaignId) return;

    const controller = new AbortController();

    fetch(`/api/${joinPath}?campaign_id=${campaignId}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAvailable(data);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [campaignId, joinPath]);

  /* ----------------------------------------------------------
     Attach
  ---------------------------------------------------------- */
  async function attach() {
    if (!selectedId || loading) return;

    setLoading(true);

    await fetch(`/api/encounters/${encounterId}/${joinPath}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [idField]: selectedId }),
    });

    const refreshed = await fetch(
      `/api/encounters/${encounterId}/${joinPath}`,
      { credentials: "include" }
    ).then((r) => r.json());

    setAttached(Array.isArray(refreshed) ? refreshed : []);
    setSelectedId("");
    setLoading(false);
  }

  /* ----------------------------------------------------------
     Detach
  ---------------------------------------------------------- */
  async function detach(id) {
    await fetch(
      `/api/encounters/${encounterId}/${joinPath}?${idField}=${id}`,
      { method: "DELETE", credentials: "include" }
    );

    setAttached((prev) => prev.filter((r) => r[idField] !== id));
  }

  return (
    <div className="cm-join-panel">
      <h3>{title}</h3>

      <ul>
        {attached.length === 0 && <li>None</li>}

        {attached.map((r) => (
          <li key={r[idField]}>
            {r[labelField]}
            <button onClick={() => detach(r[idField])}>Remove</button>
          </li>
        ))}
      </ul>

      <div className="cm-join-add">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">Add existing…</option>
          {available.map((r) => (
            <option
              key={r.id}
              value={r.id}
              disabled={attached.some(a => a[idField] === r.id)}
            >
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
