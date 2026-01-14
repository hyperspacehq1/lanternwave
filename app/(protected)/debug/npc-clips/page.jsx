"use client";

import { useEffect, useState } from "react";

/**
 * Fetch helper that NEVER blindly calls res.json().
 * It captures:
 * - status
 * - content-type
 * - redirected + final URL
 * - short body preview for HTML/error pages
 */
async function fetchJsonStrict(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...opts,
  });

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  const meta = {
    url,
    finalUrl: res.url,
    status: res.status,
    ok: res.ok,
    redirected: res.redirected,
    contentType,
  };

  // HTML (login page, 404 page, error page, middleware redirect page, etc.)
  const looksLikeHtml = text.trim().startsWith("<") || contentType.includes("text/html");
  if (looksLikeHtml) {
    const preview = text.slice(0, 400).replace(/\s+/g, " ").trim();
    throw new Error(
      [
        `HTML response (not JSON)`,
        `url: ${meta.url}`,
        `status: ${meta.status}`,
        `redirected: ${String(meta.redirected)}`,
        `finalUrl: ${meta.finalUrl}`,
        `content-type: ${meta.contentType || "(none)"}`,
        `preview: ${preview}`,
      ].join(" | ")
    );
  }

  // Not HTML — try parsing JSON
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    const preview = text.slice(0, 400).replace(/\s+/g, " ").trim();
    throw new Error(
      [
        `Invalid JSON`,
        `url: ${meta.url}`,
        `status: ${meta.status}`,
        `redirected: ${String(meta.redirected)}`,
        `finalUrl: ${meta.finalUrl}`,
        `content-type: ${meta.contentType || "(none)"}`,
        `preview: ${preview}`,
      ].join(" | ")
    );
  }

  // If server returned JSON error with non-2xx, surface it
  if (!res.ok) {
    throw new Error(
      `${url} failed (${res.status}): ${JSON.stringify(json)}`
    );
  }

  return json;
}

export default function DebugNpcClipsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState("");

  const [allNpcs, setAllNpcs] = useState(null);
  const [npcsWithClips, setNpcsWithClips] = useState(null);

  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  /* -------------------------------------------------------
     Load campaigns (prod contract: array)
  ------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const json = await fetchJsonStrict("/api/campaigns");
        if (!Array.isArray(json)) {
          throw new Error(`/api/campaigns unexpected (expected array): ${JSON.stringify(json)}`);
        }
        setCampaigns(json);
      } catch (err) {
        setErrors((e) => [...e, `Campaign load error: ${err.message}`]);
      }
    })();
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

    (async () => {
      try {
        const [npcsJson, clipsJson] = await Promise.all([
          fetchJsonStrict(`/api/npcs?campaign_id=${encodeURIComponent(campaignId)}`),
          fetchJsonStrict(`/api/debug/npcs-with-clips?campaign_id=${encodeURIComponent(campaignId)}`),
        ]);

        if (!Array.isArray(npcsJson)) {
          throw new Error(`/api/npcs unexpected (expected array): ${JSON.stringify(npcsJson)}`);
        }

        if (!clipsJson || clipsJson.ok !== true || !Array.isArray(clipsJson.npcIds)) {
          throw new Error(
            `/api/debug/npcs-with-clips unexpected: ${JSON.stringify(clipsJson)}`
          );
        }

        setAllNpcs(npcsJson);
        setNpcsWithClips(clipsJson.npcIds);
      } catch (err) {
        setErrors((e) => [...e, err.message]);
      } finally {
        setLoading(false);
      }
    })();
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
        This page does <b>not</b> affect the GM Dashboard. It exists only to expose truth.
      </p>

      <div style={{ marginBottom: 16 }}>
        <label>
          Campaign:&nbsp;
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            <option value="">-- select --</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p>Loading…</p>}

      {errors.length > 0 && (
        <div style={{ border: "2px solid red", padding: 12, marginBottom: 16 }}>
          <h3>❌ Errors</h3>
          <ul>
            {errors.map((e, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <h3>NPC ↔ Clip Reality</h3>
          <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
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
                  <td style={{ color: r.hasClips ? "green" : "gray", fontWeight: "bold" }}>
                    {r.hasClips ? "YES" : "NO"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

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
