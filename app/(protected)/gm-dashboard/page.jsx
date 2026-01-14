"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./gm-dashboard.css";
import PlayerCharactersWidget from "@/components/widgets/PlayerCharactersWidget";
import { DISPLAY_SCHEMAS as BASE_SCHEMAS } from "@/lib/gm/displaySchemas";

/* =========================
   LocalStorage Keys
========================= */
const LS_LAST_CAMPAIGN = "gm:lastCampaignId";
const LS_LAST_SESSION_BY_CAMPAIGN_PREFIX = "gm:lastSessionId:";
const LS_ORDER_PREFIX = "gm-order:";
const LS_CARD_OPEN_PREFIX = "gm-card-open:";

/* =========================
   Utils
========================= */
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

/* =========================
   NPC Pulse Helper
========================= */
async function pulseNpcClip({ npcId, durationMs }) {
  if (!npcId) return;

  const clipRes = await fetch(`/api/npcs/pulse?npc_id=${npcId}`, {
    credentials: "include",
  });
  if (!clipRes.ok) return;

  const { key } = await clipRes.json();
  if (!key) return;

  const nowRes = await fetch("/api/r2/now-playing", {
    credentials: "include",
    cache: "no-store",
  });
  const nowData = nowRes.ok ? await nowRes.json() : null;
  const previousKey = nowData?.nowPlaying?.key ?? null;

  await fetch("/api/r2/now-playing", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });

  setTimeout(async () => {
    await fetch("/api/r2/now-playing", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: previousKey }),
    });
  }, durationMs);
}

/* =========================
   Record Rendering
========================= */
function renderValue(value, type) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  if (type === "json") {
    return <pre className="gm-json">{JSON.stringify(value, null, 2)}</pre>;
  }
  return <div className="gm-text">{String(value)}</div>;
}

function RecordView({ record, schema }) {
  if (!record || !Array.isArray(schema)) return null;
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

/* =========================
   Main Page
========================= */
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

  const [npcIdsWithClips, setNpcIdsWithClips] = useState(new Set());

  const [loading, setLoading] = useState(false);
  const [expandAll, setExpandAll] = useState(null);

  const [floatingWindows, setFloatingWindows] = useState([]);
  const floatingHydratedRef = useRef(false);

  const [beacons, setBeacons] = useState({});
  const showPlayersBeacon = !!beacons?.player_characters;
  const showNpcPulseBeacon = !!beacons?.npc_pulse;

  const DISPLAY_SCHEMAS = useMemo(() => {
    return {
      ...BASE_SCHEMAS,
      events: [
        { key: "name", label: "Name" },
        { key: "description", label: "Description" },
        { key: "eventType", label: "Event Type" },
        { key: "priority", label: "Priority" },
      ],
      encounters: [
        { key: "name", label: "Name" },
        { key: "description", label: "Description" },
      ],
    };
  }, []);

  /* =========================
     Load Account Beacons
  ========================= */
  useEffect(() => {
    fetch("/api/account", { cache: "no-store", credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBeacons(d?.account?.beacons ?? {}))
      .catch(() => setBeacons({}));
  }, []);

  /* =========================
     Campaigns
  ========================= */
  useEffect(() => {
    fetch("/api/campaigns", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((arr) => {
        arr = Array.isArray(arr) ? arr : [];
        setCampaigns(arr);
        let next = null;
        const saved = localStorage.getItem(LS_LAST_CAMPAIGN);
        if (saved) next = arr.find((c) => c.id === saved) || null;
        if (!next) next = mostRecentByCreatedAt(arr);
        if (next) setSelectedCampaign(next);
      })
      .catch(() => setCampaigns([]));
  }, []);

  /* =========================
     Sessions
  ========================= */
  useEffect(() => {
    if (!selectedCampaign) return;

    fetch(`/api/sessions?campaign_id=${selectedCampaign.id}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((arr) => {
        arr = Array.isArray(arr) ? arr : [];
        setSessions(arr);
        let next = mostRecentByCreatedAt(arr);
        if (next) setSelectedSession(next);
      });
  }, [selectedCampaign]);

  /* =========================
     Load Records
  ========================= */
useEffect(() => {
  if (!selectedCampaign?.id) return;

    setLoading(true);

    Promise.all([
      fetch(`/api/events?campaign_id=${selectedCampaign.id}&session_id=${selectedSession.id}`, { credentials: "include" }).then(r => r.json()),
      fetch(`/api/npcs?campaign_id=${selectedCampaign.id}&session_id=${selectedSession.id}`, { credentials: "include" }).then(r => r.json()),
      fetch(`/api/encounters?campaign_id=${selectedCampaign.id}&session_id=${selectedSession.id}`, { credentials: "include" }).then(r => r.json()),
      fetch(`/api/locations?campaign_id=${selectedCampaign.id}&session_id=${selectedSession.id}`, { credentials: "include" }).then(r => r.json()),
      fetch(`/api/items?campaign_id=${selectedCampaign.id}&session_id=${selectedSession.id}`, { credentials: "include" }).then(r => r.json()),
    ])
      .then(([eventsRes, npcsRes, encountersRes, locationsRes, itemsRes]) => {
        setEvents(Array.isArray(eventsRes) ? eventsRes : []);
        setNpcs(Array.isArray(npcsRes) ? npcsRes : []);
        setEncounters(Array.isArray(encountersRes) ? encountersRes : []);
        setLocations(Array.isArray(locationsRes) ? locationsRes : []);
        setItems(Array.isArray(itemsRes) ? itemsRes : []);
      })
      .finally(() => setLoading(false));
  }, [selectedCampaign?.id, selectedSession?.id]);

  /* =========================
     NPCs With Clips
  ========================= */
useEffect(() => {
  if (!selectedCampaign?.id) {
    setNpcIdsWithClips(new Set());
    return;
  }

  fetch(
    `/api/npcs/with-clips?campaign_id=${selectedCampaign.id}`,
    { credentials: "include", cache: "no-store" }
  )
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!Array.isArray(d?.npcIds)) {
        setNpcIdsWithClips(new Set());
        return;
      }
      setNpcIdsWithClips(new Set(d.npcIds.map(String)));
    })
    .catch(() => setNpcIdsWithClips(new Set()));
}, [selectedCampaign?.id]);

  /* =========================
     Render
  ========================= */
  return (
    <div className="gm-page">
      <div className="gm-grid">
        <GMColumn
          title="NPCs"
          color="blue"
          entityKey="npcs"
          items={npcs}
          forceOpen={expandAll}
          sessionId={selectedSession?.id}
          schema={DISPLAY_SCHEMAS.npcs}
          onOpenEditor={(id) => router.push(`/npcs/${id}`)}
          showNpcPulseBeacon={showNpcPulseBeacon}
          npcIdsWithClips={npcIdsWithClips}
        />
      </div>

      {loading && <div className="gm-loading">Loading…</div>}
      {selectedCampaign?.id && showPlayersBeacon && (
        <PlayerCharactersWidget campaignId={selectedCampaign.id} />
      )}
    </div>
  );
}

/* =========================
   GMColumn
========================= */
function GMColumn({
  title,
  color,
  entityKey,
  items,
  forceOpen,
  sessionId,
  onOpenEditor,
  schema,
  showNpcPulseBeacon,
  npcIdsWithClips,
}) {
  return (
    <div className={`gm-column gm-${color}`}>
      <div className="gm-column-header">{title}</div>
      <div className="gm-column-body">
        {items.map((item) => (
          <GMCard
            key={item.id}
            item={item}
            entityKey={entityKey}
            forceOpen={forceOpen}
            onOpenEditor={onOpenEditor}
            sessionId={sessionId}
            schema={schema}
            showNpcPulseBeacon={showNpcPulseBeacon}
            npcIdsWithClips={npcIdsWithClips}
          />
        ))}
      </div>
    </div>
  );
}

/* =========================
   GMCard
========================= */
function GMCard({
  item,
  entityKey,
  forceOpen,
  onOpenEditor,
  sessionId,
  schema,
  showNpcPulseBeacon,
  npcIdsWithClips,
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof forceOpen === "boolean") setOpen(forceOpen);
  }, [forceOpen]);

  return (
    <div className={`gm-card ${open ? "is-open" : ""}`}>
      <div className="gm-card-header" onClick={() => setOpen(!open)}>
        <span className="gm-card-title">{item?.name || "Untitled"}</span>

        {entityKey === "npcs" &&
          showNpcPulseBeacon &&
          npcIdsWithClips?.has(String(item.id)) && (
            <span className="npc-pulse-actions">
              <button
                className="npc-pulse-btn small"
                onClick={(e) => {
                  e.stopPropagation();
                  pulseNpcClip({ npcId: item.id, durationMs: 2500 });
                }}
              >
                ★
              </button>
              <button
                className="npc-pulse-btn large"
                onClick={(e) => {
                  e.stopPropagation();
                  pulseNpcClip({ npcId: item.id, durationMs: 30000 });
                }}
              >
                ★
              </button>
            </span>
          )}
      </div>

      {open && <RecordView record={item} schema={schema} />}
    </div>
  );
}
