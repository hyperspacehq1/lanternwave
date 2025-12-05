import React, { useState, useEffect, useRef } from "react";
import "./vectorSearch.css";

/**
 * VectorSearch Component
 * Connects to:
 *   - /.netlify/functions/api-vector-search
 *   - /.netlify/functions/api-search (AI ranking summary)
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
     Debounce user input so we don't over-query
  -------------------------------------------- */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setDebounced(query.trim());
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  /* --------------------------------------------
     Perform vector + hybrid search
  -------------------------------------------- */
  useEffect(() => {
    async function doSearch() {
      if (!debounced || debounced.length < 2) {
        setVectorResults([]);
        setHybridSummary("");
        return;
      }

      try {
        setLoading(true);
        setError("");

        // 1. VECTOR SIMILARITY SEARCH
        const vec = await fetch(
          `/.netlify/functions/api-vector-search?q=${encodeURIComponent(
            debounced
          )}`
        ).then((r) => r.json());

        if (vec.error) throw new Error(vec.error);
        setVectorResults(vec.results || []);

        // 2. HYBRID AI SUMMARY (optional)
        const hybrid = await fetch(
          `/.netlify/functions/api-search?q=${encodeURIComponent(debounced)}`
        ).then((r) => r.json());

        if (!hybrid.error) {
          setHybridSummary(hybrid.ai_summary || "");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    doSearch();
  }, [debounced]);

  /* --------------------------------------------
     Label colors for result types
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
     Format a human-readable title
  -------------------------------------------- */
  function labelFor(row) {
    if (!row) return "";
    switch (row.type) {
      case "campaign":
        return row.name || "(Unnamed Campaign)";
      case "session":
        return row.description?.slice(0, 120) || "Session";
      case "event":
        return row.description?.slice(0, 120) || "Event";
      case "encounter":
        return row.description?.slice(0, 120) || "Encounter";
      case "npc":
        return `${row.first_name || ""} ${row.last_name || ""}`;
      case "item":
      case "lore":
      case "location":
        return row.description || row.notes || "(No description)";
      default:
        return row.search_body?.slice(0, 120) || "(Unknown)";
    }
  }

  return (
    <div className="lw-vector-search-container">
      <h2 className="lw-search-title">Semantic Search</h2>

      <input
        type="text"
        className="lw-search-input"
        placeholder="Search Campaign Manager… (NPCs, Items, Events, Encounters…)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && <div className="lw-error">{error}</div>}
      {loading && <div className="lw-loading">Searching…</div>}

      {/* -----------------------------------------
          AI SUMMARY PANEL
      ----------------------------------------- */}
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

      {/* -----------------------------------------
          VECTOR RESULTS LIST
      ----------------------------------------- */}
      <div className="lw-results-list">
        {vectorResults.map((row, idx) => (
          <div key={idx} className="lw-result-card">
            <div className="lw-result-header">
              <span
                className="lw-type-chip"
                style={{ backgroundColor: typeColor[row.type] || "#888" }}
              >
                {row.type}
              </span>
              <span className="lw-similarity">
                {(row.similarity * 100).toFixed(1)}%
              </span>
            </div>

            <div className="lw-result-title">{labelFor(row)}</div>

            <div className="lw-result-body">
              {row.search_body?.slice(0, 240)}
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
