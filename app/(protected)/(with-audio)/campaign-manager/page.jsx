"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

import { cmApi } from "@/lib/cm/api";
import { getFormComponent } from "@/components/forms";

import "./campaign-manager.css";

/* ------------------------------------------------------------
   Entity rules (single source of truth)
------------------------------------------------------------ */
const ENTITY_RULES = {
  campaigns: {},
  sessions: { campaign: true },
  "player-characters": { campaign: true },
  npcs: { campaign: true },
  locations: { campaign: true },
  items: { campaign: true },
  events: { campaign: true, session: true },
  encounters: { campaign: true },
};

const CONTAINER_TYPES = [
  { id: "campaigns", label: "Campaigns" },
  { id: "sessions", label: "Sessions" },
  { id: "events", label: "Events" },
  { id: "player-characters", label: "Player Characters" },
  { id: "npcs", label: "NPCs" },
  { id: "encounters", label: "Encounters" },
  { id: "locations", label: "Locations" },
  { id: "items", label: "Items" },
];

/* ------------------------------------------------------------
   🔍 Highlight helper
------------------------------------------------------------ */
function highlight(text, query) {
  if (!text || !query) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");

  return text.split(regex).map((part, i) =>
    regex.test(part) ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>
  );
}

export default function CampaignManagerPage() {
  const [activeType, setActiveType] = useState("campaigns");
  const [records, setRecords] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [loading, setLoading] = useState(false);

  const [campaigns, setCampaigns] = useState([]);
  const [activeCampaignId, setActiveCampaignId] = useState("");
  const [activeSessionId, setActiveSessionId] = useState("");

  /* 🔍 SEARCH STATE */
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const searchAbort = useRef(null);

  const saveLabel = useMemo(
    () =>
      ({
        unsaved: "Unsaved Changes",
        saving: "Saving…",
        saved: "Saved",
        error: "Save Error",
        idle: "Idle",
      }[saveStatus]),
    [saveStatus]
  );

  const rules = ENTITY_RULES[activeType] || {};
  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);

  /* ------------------------------------------------------------
     Load campaigns
  ------------------------------------------------------------ */
  useEffect(() => {
    cmApi.list("campaigns").then(setCampaigns).catch(() => setCampaigns([]));
  }, []);

  /* ------------------------------------------------------------
     Auto-select campaign
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!campaigns.length) return;

    const stored = sessionStorage.getItem("activeCampaignId");
    const found = campaigns.find((c) => c.id === stored);
    if (found) {
      setActiveCampaignId(found.id);
      return;
    }

    const newest = [...campaigns].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )[0];

    if (newest) {
      setActiveCampaignId(newest.id);
      sessionStorage.setItem("activeCampaignId", newest.id);
    }
  }, [campaigns]);

  /* ------------------------------------------------------------
     🔍 SEARCH EFFECT (debounced)
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchAbort.current) searchAbort.current.abort();
    const controller = new AbortController();
    searchAbort.current = controller;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}`,
          { signal: controller.signal }
        );
        const json = await res.json();
        setSearchResults(json.results || []);
      } catch {
        /* ignore */
      }
    }, 250);

    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ------------------------------------------------------------
     🔍 Handle search selection
  ------------------------------------------------------------ */
  const handleSearchSelect = (r) => {
    setSearchQuery("");
    setSearchResults([]);

    if (r.campaignId !== activeCampaignId) {
      setActiveCampaignId(r.campaignId);
      sessionStorage.setItem("activeCampaignId", r.campaignId);
    }

    setActiveType(r.tab);

    setTimeout(() => {
      const list = records[r.tab] || [];
      const found = list.find((x) => x.id === r.id);
      if (found) {
        setSelectedId(found.id);
        setSelectedRecord(found);
      }
    }, 150);
  };

  /* ------------------------------------------------------------
     HARD ASSERTION
  ------------------------------------------------------------ */
  const campaignRequired =
    activeType !== "campaigns" && rules.campaign && !activeCampaignId;

  /* ------------------------------------------------------------
     Load records
  ------------------------------------------------------------ */
  useEffect(() => {
    if (campaignRequired) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      let list = [];

      try {
        if (rules.campaign) {
          const res = await fetch(
            `/api/${activeType}?campaign_id=${activeCampaignId}`
          );
          list = await res.json();
        } else {
          list = await cmApi.list(activeType);
        }

        if (!cancelled) {
          setRecords((p) => ({ ...p, [activeType]: list || [] }));
          setSelectedId(list?.[0]?.id ?? null);
          setSelectedRecord(list?.[0] ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => (cancelled = true);
  }, [activeType, activeCampaignId]);

  const activeList = records[activeType] || [];

  return (
    <div className="cm-root">
      <div className="cm-layout">
        <aside className="cm-sidebar">
          <h1 className="cm-title">Campaign Manager</h1>

          {/* 🔍 SEARCH INPUT */}
          <input
            className="cm-search"
            placeholder="Search campaigns, NPCs, locations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* 🔍 SEARCH RESULTS (updated) */}
          {searchResults.length > 0 && (
            <div className="cm-search-results">
              {searchResults.map((r) => (
                <div
                  key={`${r.entityType}-${r.id}`}
                  className="cm-search-result"
                  onClick={() => handleSearchSelect(r)}
                >
                  <div className="cm-search-row">
                    <span
                      className={`cm-search-icon cm-icon-${r.icon} cm-icon-${r.color}`}
                      aria-hidden
                    />
                    <div className="cm-search-text">
                      <div className="cm-search-label">
                        {highlight(r.label, searchQuery)}
                      </div>
                      {r.snippet && (
                        <div className="cm-search-snippet">
                          {highlight(r.snippet, searchQuery)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="cm-search-meta">{r.entityLabel}</div>
                </div>
              ))}
            </div>
          )}

          {CONTAINER_TYPES.map((c) => (
            <button
              key={c.id}
              className={`cm-container-btn ${
                c.id === activeType ? "active" : ""
              }`}
              onClick={() => setActiveType(c.id)}
            >
              {c.label}
            </button>
          ))}

          <div className="cm-save-status">Status: {saveLabel}</div>
        </aside>

        <section className="cm-main">
          {campaignRequired ? (
            <div className="cm-detail-empty">
              Select a campaign to continue.
            </div>
          ) : (
            <div className="cm-content">
              <section className="cm-list">
                {activeList.map((r) => (
                  <div
                    key={r.id}
                    className={`cm-list-item ${
                      r.id === selectedId ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedId(r.id);
                      setSelectedRecord(r);
                    }}
                  >
                    {r.name || "Unnamed"}
                  </div>
                ))}
              </section>

              <section className="cm-detail">
                {selectedRecord ? (
                  (() => {
                    const Form = getFormComponent(activeType);
                    return (
                      <Form
                        record={{
                          ...selectedRecord,
                          _campaignName: activeCampaign?.name,
                        }}
                        onChange={(next) => {
                          setSelectedRecord(next);
                          setSaveStatus("unsaved");
                        }}
                      />
                    );
                  })()
                ) : (
                  <div>Select a record.</div>
                )}
              </section>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
