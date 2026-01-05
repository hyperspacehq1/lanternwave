"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./gm-dashboard.css";
import PlayerCharactersWidget from "@/components/widgets/PlayerCharactersWidget";

/**
 * GM Dashboard
 * Read-only orchestration view for campaign content
 *
 * Notes:
 * - No DB writes. Reorder + expand state are localStorage only.
 * - Uses existing GET routes (/api/*).
 * - "Open" navigates to editor pages (e.g. /events/:id).
 */

const LS_LAST_CAMPAIGN = "gm:lastCampaignId";
const LS_LAST_SESSION_BY_CAMPAIGN_PREFIX = "gm:lastSessionId:";
const LS_ORDER_PREFIX = "gm-order:";
const LS_CARD_OPEN_PREFIX = "gm-card-open:";

/* ------------------------------------------------------------------ */
/* Display Schemas (UI-only: what to show in expanded view) */
/* ------------------------------------------------------------------ */

const DISPLAY_SCHEMAS = {
  events: [
    { key: "name", label: "Name" },
    { key: "eventType", label: "Event Type" },
    { key: "priority", label: "Priority" },
    { key: "description", label: "Description", type: "text" },
  ],
  encounters: [
    { key: "name", label: "Name" },
    { key: "description", label: "Description", type: "text" },
  ],
  locations: [
    { key: "name", label: "Name" },
    { key: "world", label: "World" },
    { key: "description", label: "Description", type: "text" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "sensory", label: "Sensory", type: "json" },
    { key: "addressStreet", label: "Street" },
    { key: "addressCity", label: "City" },
    { key: "addressState", label: "State" },
    { key: "addressZip", label: "Zip" },
    { key: "addressCountry", label: "Country" },
  ],
  items: [
    { key: "name", label: "Name" },
    { key: "itemType", label: "Item Type" },
    { key: "description", label: "Description", type: "text" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "properties", label: "Properties", type: "json" },
  ],
  npcs: [
    { key: "name", label: "Name" },
    { key: "npcType", label: "NPC Type" },
    { key: "factionAlignment", label: "Faction/Alignment" },
    { key: "description", label: "Description", type: "text" },
    { key: "goals", label: "Goals", type: "text" },
    { key: "secrets", label: "Secrets", type: "text" },
    { key: "notes", label: "Notes", type: "text" },
  ],
};

function renderValue(value, type) {
  if (value === null || value === undefined || value === "") return null;
  if (type === "json") {
    return <pre className="gm-json">{JSON.stringify(value, null, 2)}</pre>;
  }
  return <div className="gm-text">{String(value)}</div>;
}

function RecordView({ record, schema }) {
  if (!record || !schema) return null;

  return (
    <div className="gm-record">
      {schema.map(({ key, label, type }) => {
        const rendered = renderValue(record[key], type);
        if (!rendered) return null;

        return (
          <div key={key} className="gm-field">
            <div className="gm-field-label">
              <strong>{label}</strong>
            </div>
            <div className="gm-field-value">{rendered}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Utilities */
/* ------------------------------------------------------------------ */

function asDate(v) {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

function mostRecentByCreatedAt(list) {
  if (!Array.isArray(list) || list.length === 0) return null;

  const withDates = list
    .map((x) => ({ x, d: asDate(x?.created_at) }))
    .filter((r) => r.d);

  if (withDates.length === 0) return list[0] || null;
  withDates.sort((a, b) => b.d - a.d);
  return withDates[0].x || null;
}

export default function GMDashboardPage() {
  const router = useRouter();

  const [campaigns, setCampaigns] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const [events, setEvents] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(false);
  const [expandAll, setExpandAll] = useState(null);

  /* ---------------- Beacon State (SERVER) ---------------- */
  const [beacons, setBeacons] = useState({});

  useEffect(() => {
    fetch("/api/beacons", {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setBeacons(data?.beacons ?? {}))
      .catch(() => setBeacons({}));
  }, []);

  /* ---------------- Reset to Default ---------------- */

  const resetToDefault = () => {
    try {
      localStorage.removeItem(LS_LAST_CAMPAIGN);
      Object.keys(localStorage).forEach((k) => {
        if (
          k.startsWith(LS_LAST_SESSION_BY_CAMPAIGN_PREFIX) ||
          k.startsWith(LS_ORDER_PREFIX) ||
          k.startsWith(LS_CARD_OPEN_PREFIX)
        ) {
          localStorage.removeItem(k);
        }
      });
    } catch {}

    setSelectedCampaign(null);
    setSelectedSession(null);
    setSessions([]);
    setEvents([]);
    setNpcs([]);
    setEncounters([]);
    setLocations([]);
    setItems([]);
    setExpandAll(null);
  };

  /* ---------------- Initial Campaign Load ---------------- */

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((arr) => {
        setCampaigns(Array.isArray(arr) ? arr : []);
        let next = null;
        try {
          const saved = localStorage.getItem(LS_LAST_CAMPAIGN);
          if (saved) next = arr.find((c) => c.id === saved) || null;
        } catch {}
        if (!next) next = mostRecentByCreatedAt(arr);
        if (next) setSelectedCampaign(next);
      })
      .catch(() => setCampaigns([]));
  }, []);

  useEffect(() => {
    if (!selectedCampaign?.id) return;
    try {
      localStorage.setItem(LS_LAST_CAMPAIGN, selectedCampaign.id);
    } catch {}
  }, [selectedCampaign?.id]);

  /* ---------------- Sessions ---------------- */

  useEffect(() => {
    if (!selectedCampaign) return;

    setSelectedSession(null);
    setEvents([]);
    setNpcs([]);
    setEncounters([]);
    setLocations([]);
    setItems([]);

    fetch(`/api/sessions?campaign_id=${selectedCampaign.id}`)
      .then((r) => r.json())
      .then((arr) => {
        setSessions(Array.isArray(arr) ? arr : []);
        let next = null;
        try {
          const saved = localStorage.getItem(
            `${LS_LAST_SESSION_BY_CAMPAIGN_PREFIX}${selectedCampaign.id}`
          );
          if (saved) next = arr.find((s) => s.id === saved) || null;
        } catch {}
        if (!next) next = mostRecentByCreatedAt(arr);
        if (next) setSelectedSession(next);
      })
      .catch(() => setSessions([]));
  }, [selectedCampaign]);

  useEffect(() => {
    if (!selectedCampaign?.id || !selectedSession?.id) return;
    try {
      localStorage.setItem(
        `${LS_LAST_SESSION_BY_CAMPAIGN_PREFIX}${selectedCampaign.id}`,
        selectedSession.id
      );
    } catch {}
  }, [selectedCampaign?.id, selectedSession?.id]);

  /* ---------------- Load GM Data ---------------- */

  useEffect(() => {
    if (!selectedSession || !selectedCampaign?.id) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/events?campaign_id=${selectedCampaign.id}`).then((r) => r.json()),
      fetch(`/api/npcs?campaign_id=${selectedCampaign.id}`).then((r) => r.json()),
      fetch(`/api/encounters?campaign_id=${selectedCampaign.id}`).then((r) => r.json()),
      fetch(`/api/locations?campaign_id=${selectedCampaign.id}`).then((r) => r.json()),
      fetch(`/api/items?campaign_id=${selectedCampaign.id}`).then((r) => r.json()),
    ])
      .then(([events, npcs, encounters, locations, items]) => {
        setEvents(events || []);
        setNpcs(npcs || []);
        setEncounters(encounters || []);
        setLocations(locations || []);
        setItems(items || []);
      })
      .catch(() => {
        setEvents([]);
        setNpcs([]);
        setEncounters([]);
        setLocations([]);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [selectedSession, selectedCampaign?.id]);

  const editorPathFor = (entityKey, id) => {
    const map = {
      events: "events",
      npcs: "npcs",
      locations: "locations",
      encounters: "encounters",
      items: "items",
    };
    return map[entityKey] ? `/${map[entityKey]}/${id}` : null;
  };

  return (
    <div className="gm-page">
      {/* === GM DASHBOARD UI (RESTORE THIS) === */}
      <div className="gm-toolbar">
        {/* campaign + session selectors */}
      </div>

      <div className="gm-grid">
        {/* events / npcs / encounters / locations / items columns */}
      </div>

      {/* === WIDGETS (already correct) === */}
      {selectedCampaign?.id && beacons.player_characters && (
        <PlayerCharactersWidget campaignId={selectedCampaign.id} />
      )}
    </div>
  );
}