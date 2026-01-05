"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./gm-dashboard.css";
import PlayerCharactersWidget from "@/components/widgets/PlayerCharactersWidget"; // ✅ NEW

const LS_LAST_CAMPAIGN = "gm:lastCampaignId";
const LS_LAST_SESSION_BY_CAMPAIGN_PREFIX = "gm:lastSessionId:";
const LS_ORDER_PREFIX = "gm-order:";
const LS_CARD_OPEN_PREFIX = "gm-card-open:";

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

  // ✅ NEW — Beacons
  const [beacons, setBeacons] = useState({});

  useEffect(() => {
    fetch("/api/beacons")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBeacons(d?.beacons ?? {}))
      .catch(() => setBeacons({}));
  }, []);

  /* ---------------- Campaigns ---------------- */
  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((arr) => {
        arr = Array.isArray(arr) ? arr : [];
        setCampaigns(arr);

        let next = null;
        const saved = localStorage.getItem(LS_LAST_CAMPAIGN);
        if (saved) next = arr.find((c) => c.id === saved);
        if (!next) next = mostRecentByCreatedAt(arr);
        if (next) setSelectedCampaign(next);
      });
  }, []);

  useEffect(() => {
    if (selectedCampaign?.id) {
      localStorage.setItem(LS_LAST_CAMPAIGN, selectedCampaign.id);
    }
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
        arr = Array.isArray(arr) ? arr : [];
        setSessions(arr);

        let next = null;
        const saved = localStorage.getItem(
          `${LS_LAST_SESSION_BY_CAMPAIGN_PREFIX}${selectedCampaign.id}`
        );
        if (saved) next = arr.find((s) => s.id === saved);
        if (!next) next = mostRecentByCreatedAt(arr);
        if (next) setSelectedSession(next);
      });
  }, [selectedCampaign]);

  useEffect(() => {
    if (selectedCampaign?.id && selectedSession?.id) {
      localStorage.setItem(
        `${LS_LAST_SESSION_BY_CAMPAIGN_PREFIX}${selectedCampaign.id}`,
        selectedSession.id
      );
    }
  }, [selectedCampaign?.id, selectedSession?.id]);

  /* ---------------- Load Data ---------------- */
  useEffect(() => {
    if (!selectedSession) return;

    setLoading(true);

    Promise.all([
      fetch(`/api/events?session_id=${selectedSession.id}`).then((r) => r.json()),
      fetch(`/api/npcs?session_id=${selectedSession.id}`).then((r) => r.json()),
      fetch(`/api/encounters?session_id=${selectedSession.id}`).then((r) => r.json()),
      fetch(`/api/locations?session_id=${selectedSession.id}`).then((r) => r.json()),
      fetch(`/api/items?session_id=${selectedSession.id}`).then((r) => r.json()),
    ])
      .then(([events, npcs, encounters, locations, items]) => {
        setEvents(events || []);
        setNpcs(npcs || []);
        setEncounters(encounters || []);
        setLocations(locations || []);
        setItems(items || []);
      })
      .finally(() => setLoading(false));
  }, [selectedSession]);

  const canUseSession = !!selectedSession?.id;

  return (
    <div className="gm-page">
      {/* TOOLBAR */}
      {/* (unchanged — your original JSX stays here) */}

      {!selectedCampaign && (
        <div className="gm-empty">Select or create a campaign to begin.</div>
      )}

      {selectedCampaign && !selectedSession && (
        <div className="gm-empty">Select or create a session.</div>
      )}

      {selectedSession && (
        <div className="gm-grid">
          {/* your original GMColumn components unchanged */}
        </div>
      )}

      {loading && <div className="gm-loading">Loading…</div>}

      {/* ✅ WIDGET */}
      {selectedCampaign?.id && beacons.player_characters && (
        <PlayerCharactersWidget campaignId={selectedCampaign.id} />
      )}
    </div>
  );
}
