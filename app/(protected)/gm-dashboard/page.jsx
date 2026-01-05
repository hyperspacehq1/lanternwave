"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./gm-dashboard.css";
import PlayerCharactersWidget from "@/components/widgets/PlayerCharactersWidget";

/* ------------------------------------------------------------------ */
/* Display Schemas (UI-only) */
/* ------------------------------------------------------------------ */

const DISPLAY_SCHEMAS = {
  events: [
    { key: "name", label: "Name" },
    { key: "eventType", label: "Type" },
    { key: "description", label: "Description" },
  ],

  encounters: [
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
  ],

  items: [
    { key: "name", label: "Name" },
    { key: "itemType", label: "Type" },
    { key: "description", label: "Description" },
    { key: "notes", label: "Notes" },
    { key: "properties", label: "Properties", type: "json" },
  ],

  npcs: [
    { key: "name", label: "Name" },
    { key: "npcType", label: "Type" },
    { key: "description", label: "Description" },
    { key: "goals", label: "Goals" },
    { key: "secrets", label: "Secrets", type: "json" },
  ],

  locations: [
    { key: "name", label: "Name" },
    { key: "world", label: "World" },
    { key: "description", label: "Description" },
    { key: "sensory", label: "Sensory", type: "json" },
  ],
};

/* ------------------------------------------------------------------ */
/* Record View Component */
/* ------------------------------------------------------------------ */

function RecordView({ record, schema }) {
  if (!schema) return null;

  return (
    <div className="gm-record">
      {schema.map(({ key, label, type }) => {
        const value = record[key];
        if (value == null || value === "") return null;

        if (type === "json") {
          return (
            <div key={key} className="gm-field">
              <strong>{label}</strong>
              <pre>{JSON.stringify(value, null, 2)}</pre>
            </div>
          );
        }

        return (
          <div key={key} className="gm-field">
            <strong>{label}</strong>
            <div>{String(value)}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Constants */
/* ------------------------------------------------------------------ */

const LS_LAST_CAMPAIGN = "gm:lastCampaignId";
const LS_LAST_SESSION_BY_CAMPAIGN_PREFIX = "gm:lastSessionId:";
const LS_ORDER_PREFIX = "gm-order:";
const LS_CARD_OPEN_PREFIX = "gm-card-open:";

/* ------------------------------------------------------------------ */
/* Page */
/* ------------------------------------------------------------------ */

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
  const [widgets, setWidgets] = useState({});

  useEffect(() => {
    fetch("/api/widgets")
      .then((r) => r.json())
      .then((data) => setWidgets(data || {}))
      .catch(() => setWidgets({}));
  }, []);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((arr) => {
        setCampaigns(arr || []);
        const saved = localStorage.getItem(LS_LAST_CAMPAIGN);
        setSelectedCampaign(arr.find((c) => c.id === saved) || arr[0] || null);
      });
  }, []);

  useEffect(() => {
    if (!selectedCampaign) return;

    fetch(`/api/sessions?campaign_id=${selectedCampaign.id}`)
      .then((r) => r.json())
      .then((arr) => {
        setSessions(arr || []);
        setSelectedSession(arr[0] || null);
      });
  }, [selectedCampaign]);

  useEffect(() => {
    if (!selectedCampaign) return;

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
      .finally(() => setLoading(false));
  }, [selectedCampaign]);

  const editorPathFor = (entityKey, id) =>
    id ? `/${entityKey}/${id}` : null;

  return (
    <div className="gm-page">
      <div className="gm-grid">
        <GMColumn title="Events" entityKey="events" items={events} />
        <GMColumn title="NPCs" entityKey="npcs" items={npcs} />
        <GMColumn title="Encounters" entityKey="encounters" items={encounters} />
        <GMColumn title="Locations" entityKey="locations" items={locations} />
        <GMColumn title="Items" entityKey="items" items={items} />
      </div>

      {loading && <div className="gm-loading">Loading…</div>}

      {selectedCampaign?.id && (
        <PlayerCharactersWidget campaignId={selectedCampaign.id} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Column */
/* ------------------------------------------------------------------ */

function GMColumn({ title, entityKey, items }) {
  return (
    <div className="gm-column">
      <div className="gm-column-header">{title}</div>
      <div className="gm-column-body">
        {items.map((item) => (
          <GMCard
            key={item.id}
            item={item}
            entityKey={entityKey}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card */
/* ------------------------------------------------------------------ */

function GMCard({ item, entityKey }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (open && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [open, item]);

  return (
    <div className={`gm-card ${open ? "is-open" : ""}`}>
      <div
        className="gm-card-header"
        role="button"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="gm-card-title">{item.name || "Untitled"}</span>
        <button className="gm-card-action-btn">
          {open ? "−" : "+"}
        </button>
      </div>

      <div
        className="gm-card-body-wrapper"
        style={{
          maxHeight: open ? `${height}px` : "0px",
          opacity: open ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="gm-card-body">
          <RecordView
            record={item}
            schema={DISPLAY_SCHEMAS[entityKey]}
          />
        </div>
      </div>
    </div>
  );
}
