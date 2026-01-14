"use client";

import { useEffect, useState } from "react";

export default function DebugNpcClipsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState("");

  const [allNpcs, setAllNpcs] = useState(null);
  const [npcsWithClips, setNpcsWithClips] = useState(null);

  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  /* -------------------------------------------------------
     Load campaigns
  ------------------------------------------------------- */
useEffect(() => {
  fetch("/api/campaigns", {
    credentials: "include",
    cache: "no-store",
  })
    .then(async (r) => {
      const json = await r.json();

      if (!r.ok) {
        throw new Error(
          `/api/campaigns failed (${r.status}): ${JSON.stringify(json)}`
        );
      }

      if (!Array.isArray(json)) {
        throw new Error(
          `/api/campaigns unexpected response: ${JSON.stringify(json)}`
        );
      }

      setCampaigns(json);
    })
    .catch((err) => {
      setErrors((e) => [...e, `Campaign load error: ${err.message}`]);
    });
}, []);

  /* -------------------------------------------------------
     Load NPCs + NPCs-with-clips when campaign changes
  ------------------------------------------------------- */
  useEffect(() => {
    if (!campaignId) return;

    setLoading(true);
    setErrors([]);
    setAllNpcs(null);
    setNpcsWithClips(null);

    Promise.all([
      fetch(`/api/npcs?campaign_id=${campaignId}`, {
  credentials: "include",
  cache: "no-store",
}).then(async (r) => {
  const json = await r.json();

  if (!r.ok) {
    throw new Error(
      `/api/npcs failed (${r.status}): ${JSON.stringify(json)}`
    );
  }

  if (!Array.isArray(json)) {
    throw new Error(
      `/api/npcs unexpected response: ${JSON.stringify(json)}`
    );
  }

  return json;
});

      fetch(`/api/debug/npcs-with-clips?campaign_id=${campaignId}`, {
        credentials: "include",
      }).then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json?.ok) {
          throw new Error(
            `/api/debug/npcs-with-clips failed (${r.status}): ${JSON.stringify(
              json
            )}`
          );
        }
        return json.npcIds || [];
      }),
    ])
      .then(([npcs, npcIdsWithClips]) => {
        setAllNpcs(npcs);
        setNpcsWithClips(npcIdsWithClips);
      })
      .catch((err) => {
        setErrors((e) => [...e, err.message]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [campaignId]);

  /* -------------------------------------------------------
     Derived comparison
  ------------------------------------------------------- */
  const npcClipSet = new Set(npcsWithClips || []);

  const rows =
    Array.isArray(allNpcs) && Array.isArray(npcsWithClips)
      ? allNpcs.map((npc) => ({
          id: npc.id,
          name: npc.name || "(unnamed)",
          hasClips: npcClipSet.has(String(npc.id)),
        }))
      : [];

  /* -------------------------------------------------------
     Render
  ------------------------------------------------------- */
  return (
    <div style={{ padding: 24, fontFamily: "monospace" }}>
      <h1>🧪 NPC Clip Debug Page</h1>
      <p>
        This page does <b>not</b> affect the GM Dashboard. It exists only to
        expose truth.
      </p>

      {/* Campaign Selector */}
      <div style={{ marginBottom: 16 }}>
        <label>
          Campaign:&nbsp;
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            <option value="">-- select --</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Loading */}
      {loading && <p>Loading…</p>}

      {/* Errors */}
      {errors.length > 0 && (
        <div
          style={{
            border: "2px solid red",
            padding: 12,
            marginBottom: 16,
          }}
        >
          <h3>❌ Errors</h3>
          <ul>
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Table */}
      {rows.length > 0 && (
        <>
          <h3>NPC ↔ Clip Reality</h3>
          <table
            border="1"
            cellPadding="6"
            style={{ borderCollapse: "collapse", width: "100%" }}
          >
            <thead>
              <tr>
                <th>NPC Name</th>
                <th>NPC ID</th>
                <th>Has Clips?</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.id}</td>
                  <td
                    style={{
                      color: r.hasClips ? "green" : "gray",
                      fontWeight: "bold",
                    }}
                  >
                    {r.hasClips ? "YES" : "NO"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Raw JSON */}
      {(allNpcs || npcsWithClips) && (
        <>
          <h3>📦 Raw JSON</h3>

          <h4>/api/npcs</h4>
          <pre>{JSON.stringify(allNpcs, null, 2)}</pre>

          <h4>/api/debug/npcs-with-clips</h4>
          <pre>{JSON.stringify(npcsWithClips, null, 2)}</pre>
        </>
      )}
    </div>
  );
}
