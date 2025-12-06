import React, { useState, useEffect, useRef } from "react";
import "./vectorSearch.css";

/**
 * Lanternwave Vector Search (Phase 2)
 *
 * - Debounced query
 * - Vector Search + AI hybrid summary
 * - Type chips w/ color coding
 * - Expand/collapse summary
 * - Cleaner, console-style layout
 */
export default function VectorSearch() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [vectorResults, setVectorResults] = useState([]);
  const [hybridSummary, setHybridSummary] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);

  const debounceRef = useRef(null);

  /* --------------------------------------------
     Debounce query input
  -------------------------------------------- */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setDebounced(query.trim());
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  /* --------------------------------------------
     Execute Search → vector + hybrid
  -------------------------------------------- */
  useEffect(() => {
    async function runSearch() {
      if (!debounced || debounced.length < 2) {
        setVectorResults([]);
        setHybridSummary("");
        return;
      }

      try {
        setLoading(true);
        setError("");

        // 1️⃣ VECTOR SEARCH
        const vec = await fetch(
          `/.netlify/functions/api-vector-search?q=${encodeURIComponent(
            debounced
          )}`
        ).then((r) => r.json());

        if (vec.error) throw new Error(vec.error);
        setVectorResults(vec.results || []);

        // 2️⃣ AI HYBRID SUMMARY
        const summaryResp = await fetch(
          `/.netlify/functions/api-search?q=${encodeURIComponent(debounced)}`
        ).then((r) => r.json());

        if (!summaryResp.error) {
          setHybridSummary(summaryResp.ai_summary || "");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    runSearch();
  }, [debounced]);

  /* --------------------------------------------
     Type chip colors
  -------------------------------------------- */
  const typeColor = {
    campaign: "#7FD1B9",
    session: "#6cc5f0",
    event: "#d7ff70",
    encounter: "#ff9e59",
    npc: "#ff70a6",
    item: "#cdb4ff",
    location: "#ffd670",
    lore: "#70ffc3",
  };

  /* --------------------------------------------
     Human-readable titles
  -------------------------------------------- */
  function labelFor(row) {
    if (!row) return "";
    switch (row.type) {
      case "campaign": return row.name || "(Untitled Campaign)";
      case "npc": return `${row.first_name || ""} ${row.last_name || ""}`.trim();
      default: return row.description || row.notes || row.search_body?.slice(0, 200) || "(No description)";
    }
  }

  return (
    <div className="lw-search-root search-root">
      {/* TITLE */}
      <h1 className="lw-search-title">Search</h1>
      <h2 className="lw-search-subtitle">Semantic Search</h2>

      {/* INPUT */}
      <input
        type="text"
        className="lw-search-input"
        placeholder="Search Campaign Manager… (NPCs, Items, Events, Encounters…)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && <div className="lw-error">{error}</div>}
      {loading && <div className="lw-loading">Searching…</div>}

      {/* AI SUMMARY */}
      {hybridSummary && (
        <div className="lw-ai-summary">
          <div
            className="lw-ai-summary-header"
            onClick={() => setExpanded(!expanded)}
          >
            <span>AI Summary</span>
            <span className="lw-toggle">{expanded ? "▲" : "▼"}</span>
          </div>
          {expanded && (
            <div className="lw-ai-body">{hybridSummary}</div>
          )}
        </div>
      )}

      {/* RESULTS */}
      <div className="lw-results-list">
        {vectorResults.map((row, idx) => (
          <div key={idx} className="lw-result-card">
            <div className="lw-result-header">
              <span
                className="lw-type-chip"
                style={{ backgroundColor: typeColor[row.type] || "#999" }}
              >
                {row.type}
              </span>
              <span className="lw-similarity">
                {(row.similarity * 100).toFixed(1)}%
              </span>
            </div>

            <div className="lw-result-title">{labelFor(row)}</div>

            <div className="lw-result-body">
              {row.search_body?.slice(0, 280)}
            </div>
          </div>
        ))}

        {!loading && vectorResults.length === 0 && debounced.length >= 2 && (
          <div className="lw-no-results">No semantic matches found.</div>
        )}
      </div>
    </div>
  );
}
