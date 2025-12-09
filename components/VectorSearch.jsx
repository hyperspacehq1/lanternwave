import React, { useState, useEffect, useRef } from "react";
import "./vectorSearch.css";

export default function VectorSearch() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [vectorResults, setVectorResults] = useState([]);
  const [hybridSummary, setHybridSummary] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRecord, setModalRecord] = useState(null);

  const debounceRef = useRef(null);

  // ------------------------------------------------------
  // Debounce input
  // ------------------------------------------------------
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setDebounced(query.trim());
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // ------------------------------------------------------
  // Perform Vector + AI Search
  // ------------------------------------------------------
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

        // VECTOR SEARCH
        const vec = await fetch(
          `/.netlify/functions/api-vector-search?q=${encodeURIComponent(
            debounced
          )}`
        ).then((r) => r.json());

        if (vec.error) throw new Error(vec.error);
        setVectorResults(vec.results || []);

        // AI SUMMARY
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

  // ------------------------------------------------------
  // Similarity Heat Color
  // ------------------------------------------------------
  function similarityColor(score) {
    const pct = score * 100;

    if (pct >= 85) return "rgba(108, 255, 108, 0.9)";
    if (pct >= 60) return "rgba(108, 196, 255, 0.9)";
    if (pct >= 40) return "rgba(255, 255, 120, 0.9)";
    if (pct >= 20) return "rgba(255, 180, 80, 0.9)";
    return "rgba(255, 80, 80, 0.9)";
  }

  // ------------------------------------------------------
  // Modal open
  // ------------------------------------------------------
  function openModal(record) {
    setModalRecord(record);
    setModalOpen(true);
  }

  // Human-readable label
  function labelFor(row) {
    if (!row) return "";
    switch (row.type) {
      case "campaign":
        return row.name || "Untitled Campaign";
      case "npc":
        return `${row.first_name || ""} ${row.last_name || ""}`.trim();
      default:
        return (
          row.description ||
          row.notes ||
          row.search_body?.slice(0, 200) ||
          "(No description)"
        );
    }
  }

  return (
    <div className="lw-search-root search-root">
      <h1 className="lw-search-title">Search</h1>
      <h2 className="lw-search-subtitle">Semantic Search</h2>

      <input
        type="text"
        className="lw-search-input"
        placeholder="Search Campaign Manager… (NPCs, Items, Events...)"
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
          <div
            key={idx}
            className="lw-result-card fade-in"
            style={{
              borderLeft: `6px solid ${similarityColor(row.similarity)}`,
            }}
            onClick={() => openModal(row)}
          >
            <div className="lw-result-header">
              <span
                className="lw-type-chip"
                style={{ backgroundColor: similarityColor(row.similarity) }}
              >
                {row.type}
              </span>
              <span className="lw-similarity">
                {(row.similarity * 100).toFixed(1)}%
              </span>
            </div>

            <div className="lw-result-title">{labelFor(row)}</div>
            <div className="lw-result-body">
              {row.search_body?.slice(0, 260)}
            </div>
          </div>
        ))}
      </div>

      {!loading &&
        vectorResults.length === 0 &&
        debounced.length >= 2 && (
          <div className="lw-no-results">No matches found.</div>
        )}

      {/* ------------------------------------------------------------------
          MINI PREVIEW MODAL
      ------------------------------------------------------------------ */}
      {modalOpen && modalRecord && (
        <div className="lw-modal-overlay" onClick={() => setModalOpen(false)}>
          <div
            className="lw-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lw-modal-header">
              <span>{labelFor(modalRecord)}</span>
              <button
                className="lw-modal-close"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="lw-modal-meta">
              Type: {modalRecord.type}  
              <br />
              Similarity: {(modalRecord.similarity * 100).toFixed(1)}%
            </div>

            <div className="lw-modal-body">
              {modalRecord.search_body || "(No body text)"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
