// ===== CampaignManager.jsx — Part 1 of 4 =====
import { v4 as uuidv4 } from "uuid";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import "./campaignManager.css";

// Available containers (left sidebar)
const CONTAINER_TYPES = [
  { id: "campaigns", label: "Campaigns" },
  { id: "sessions", label: "Sessions" },
  { id: "events", label: "Events" },
  { id: "playerCharacters", label: "Player Characters" },
  { id: "npcs", label: "NPCs" },
  { id: "encounters", label: "Encounters" },
  { id: "quests", label: "Quests / Missions" },
  { id: "locations", label: "Locations" },
  { id: "items", label: "Items / Artifacts" },
  { id: "lore", label: "Lore / Secrets" },
  { id: "logs", label: "Session Logs" },
];

const FAKE_ID = () => uuidv4();

// Netlify 2025 endpoint map
const API_ENDPOINTS = {
  campaigns: "/.netlify/functions/api-campaigns",
  sessions: "/.netlify/functions/api-sessions",
  events: "/.netlify/functions/api-events",
  playerCharacters: "/.netlify/functions/api-player-characters",
  npcs: "/.netlify/functions/api-npcs",
  encounters: "/.netlify/functions/api-encounters",
  quests: "/.netlify/functions/api-quests",
  locations: "/.netlify/functions/api-locations",
  items: "/.netlify/functions/api-items",
  lore: "/.netlify/functions/api-lore",
  logs: "/.netlify/functions/api-logs",
};

const ADMIN_HEADER_KEY = "x-admin-key";

// Map from container type to the fields we display on the list
const LIST_COLUMNS = {
  campaigns: ["name", "worldSetting", "date"],
  sessions: ["name", "date", "locationName"],
  events: ["name", "type", "sessionName"],
  playerCharacters: ["name", "class", "level"],
  npcs: ["name", "role", "faction"],
  encounters: ["name", "challengeRating", "sessionName"],
  quests: ["name", "status", "priority"],
  locations: ["name", "type", "region"],
  items: ["name", "rarity", "owner"],
  lore: ["title", "category", "scope"],
  logs: ["sessionName", "date", "summary"],
};

// Helpers to normalize records from API <-> UI
function fromApi(type, record) {
  if (!record) return record;

  switch (type) {
    case "campaigns": {
      return {
        ...record,
        type: "campaign",
      };
    }
    case "sessions": {
      return {
        ...record,
        type: "session",
      };
    }
    case "events": {
      return {
        ...record,
        type: "event",
      };
    }
    case "playerCharacters": {
      return {
        ...record,
        type: "playerCharacter",
      };
    }
    case "npcs": {
      return {
        ...record,
        type: "npc",
      };
    }
    case "encounters": {
      return {
        ...record,
        type: "encounter",
      };
    }
    case "quests": {
      return {
        ...record,
        type: "quest",
      };
    }
    case "locations": {
      return {
        ...record,
        type: "location",
      };
    }
    case "items": {
      return {
        ...record,
        type: "item",
      };
    }
    case "lore": {
      return {
        ...record,
        type: "lore",
      };
    }
    case "logs": {
      return {
        ...record,
        type: "log",
      };
    }
    default:
      return record;
  }
}

function toApi(type, record) {
  if (!record) return record;

  switch (type) {
    case "campaigns": {
      const { _isNew, type: _t, ...rest } = record;
      return rest;
    }
    case "sessions": {
      const { _isNew, type: _t, sessionName, campaignName, ...rest } = record;
      return rest;
    }
    case "events": {
      const { _isNew, type: _t, sessionName, ...rest } = record;
      return rest;
    }
    case "playerCharacters": {
      const { _isNew, type: _t, ...rest } = record;
      return rest;
    }
    case "npcs": {
      const { _isNew, type: _t, ...rest } = record;
      return rest;
    }
    case "encounters": {
      const { _isNew, type: _t, sessionName, ...rest } = record;
      return rest;
    }
    case "quests": {
      const { _isNew, type: _t, ...rest } = record;
      return rest;
    }
    case "locations": {
      const { _isNew, type: _t, ...rest } = record;
      return rest;
    }
    case "items": {
      const { _isNew, type: _t, ...rest } = record;
      return rest;
    }
    case "lore": {
      const { _isNew, type: _t, ...rest } = record;
      return rest;
    }
    case "logs": {
      const { _isNew, type: _t, ...rest } = record;
      return rest;
    }
    default: {
      const { _isNew, ...rest } = record;
      return rest;
    }
  }
}

function CampaignManager() {
  // ----- GLOBAL STATE -----
  const [activeType, setActiveType] = useState("campaigns");

  const [data, setData] = useState({
    campaigns: [],
    sessions: [],
    events: [],
    playerCharacters: [],
    npcs: [],
    encounters: [],
    quests: [],
    locations: [],
    items: [],
    lore: [],
    logs: [],
  });

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedCampaignGlobal, setSelectedCampaignGlobal] = useState(null);

  const [saveStatus, setSaveStatus] = useState("idle"); // idle | unsaved | saving | saved | error
  const autosaveTimer = useRef(null);

  // MU/TH/UR Modal Warning for Sessions
  const [warningMessage, setWarningMessage] = useState("");
  const [showWarningModal, setShowWarningModal] = useState(false);

  const showCampaignWarning = () => {
    setWarningMessage(
      "Select or create a Campaign before you select/create a Session."
    );
    setShowWarningModal(true);
  };

  // ---------------------------------------------
  // ADMIN KEY (for secured Netlify Functions)
  // ---------------------------------------------
  const ADMIN_KEY =
    (typeof window !== "undefined" &&
      window.localStorage.getItem("campaign_admin_key")) ||
    "";

  const setAdminKey = (val) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("campaign_admin_key", val);
    }
  };

  // ---------------------------------------------
  // FETCH HELPERS (Netlify 2025 style, classic handler)
  // ---------------------------------------------
  async function apiFetch(type, options = {}) {
    const endpoint = API_ENDPOINTS[type];
    if (!endpoint) throw new Error(`No endpoint configured for type: ${type}`);

    const {
      method = "GET",
      body,
      query = {},
      signal,
      headers: extraHeaders = {},
    } = options;

    const url = new URL(endpoint, window.location.origin);
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, v);
      }
    });

    const headers = {
      "Content-Type": "application/json",
      [ADMIN_HEADER_KEY]: ADMIN_KEY || "",
      ...extraHeaders,
    };

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `API error ${res.status} on ${url.toString()}: ${text || res.statusText}`
      );
    }

    return res.json();
  }

  async function loadAllData() {
    try {
      const [
        campaignsRes,
        sessionsRes,
        eventsRes,
        playerCharsRes,
        npcsRes,
        encountersRes,
        questsRes,
        locationsRes,
        itemsRes,
        loreRes,
        logsRes,
      ] = await Promise.all([
        apiFetch("campaigns"),
        apiFetch("sessions"),
        apiFetch("events"),
        apiFetch("playerCharacters"),
        apiFetch("npcs"),
        apiFetch("encounters"),
        apiFetch("quests"),
        apiFetch("locations"),
        apiFetch("items"),
        apiFetch("lore"),
        apiFetch("logs"),
      ]);

      const campaigns = (campaignsRes.records || []).map((r) =>
        fromApi("campaigns", r)
      );
      const sessions = (sessionsRes.records || []).map((r) =>
        fromApi("sessions", r)
      );
      const events = (eventsRes.records || []).map((r) =>
        fromApi("events", r)
      );
      const playerCharacters = (playerCharsRes.records || []).map((r) =>
        fromApi("playerCharacters", r)
      );
      const npcs = (npcsRes.records || []).map((r) => fromApi("npcs", r));
      const encounters = (encountersRes.records || []).map((r) =>
        fromApi("encounters", r)
      );
      const quests = (questsRes.records || []).map((r) =>
        fromApi("quests", r)
      );
      const locations = (locationsRes.records || []).map((r) =>
        fromApi("locations", r)
      );
      const items = (itemsRes.records || []).map((r) => fromApi("items", r));
      const lore = (loreRes.records || []).map((r) => fromApi("lore", r));
      const logs = (logsRes.records || []).map((r) => fromApi("logs", r));

      setData({
        campaigns,
        sessions,
        events,
        playerCharacters,
        npcs,
        encounters,
        quests,
        locations,
        items,
        lore,
        logs,
      });

      if (!selectedCampaignGlobal && campaigns.length > 0) {
        setSelectedCampaignGlobal(campaigns[0]);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
  }

  // Initial load
  useEffect(() => {
    loadAllData();
  }, []);

  // ---------------------------------------------
  // AUTOSAVE LOGIC
  // ---------------------------------------------
  const scheduleSave = (type, record) => {
    if (!record) return;
    setSaveStatus("unsaved");

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = setTimeout(async () => {
      try {
        setSaveStatus("saving");
        const apiRecord = toApi(type, record);

        if (record._isNew) {
          const res = await apiFetch(type, {
            method: "POST",
            body: apiRecord,
          });
          const created = fromApi(type, res.record);
          setData((prev) => {
            const updatedList = [...prev[type].filter((r) => r.id !== record.id), created];
            return { ...prev, [type]: updatedList };
          });
          setSelectedRecord(created);
        } else {
          const res = await apiFetch(type, {
            method: "PUT",
            body: apiRecord,
          });
          const updated = fromApi(type, res.record);
          setData((prev) => {
            const updatedList = prev[type].map((r) =>
              r.id === updated.id ? updated : r
            );
            return { ...prev, [type]: updatedList };
          });
          setSelectedRecord(updated);
        }

        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 1500);
      } catch (err) {
        console.error("Autosave error:", err);
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    }, 600);
  };

  const triggerAutosave = (updatedRecord) => {
    scheduleSave(activeType, updatedRecord);
  };

  // ---------------------------------------------
  // HANDLERS FOR SIDEBAR + SELECTION
  // ---------------------------------------------
  const handleSelectType = (typeId) => {
    if (typeId === "sessions" && !selectedCampaignGlobal) {
      showCampaignWarning();
      return;
    }

    setActiveType(typeId);
    setSelectedRecord(null);
  };

  const handleSelectRecord = (record) => {
    if (!record) return;

    if (
      activeType === "sessions" &&
      (!selectedCampaignGlobal || record.campaignId !== selectedCampaignGlobal.id)
    ) {
      const matchedCampaign = data.campaigns.find(
        (c) => c.id === record.campaignId
      );
      if (matchedCampaign) {
        setSelectedCampaignGlobal(matchedCampaign);
      } else {
        showCampaignWarning();
      }
    }
    setSelectedRecord(record);
  };

  // ---------------------------------------------
  // CREATE NEW RECORD
  // ---------------------------------------------
  const handleCreate = () => {
    if (activeType === "sessions" && !selectedCampaignGlobal) {
      showCampaignWarning();
      return;
    }

    const common = { id: FAKE_ID(), _isNew: true };

    const newItemByType = {
      campaigns: {
        ...common,
        name: "New Campaign",
        description: "",
        worldSetting: "",
        date: "",
      },
      sessions: {
        ...common,
        name: "New Session",
        description: "",
        date: "",
        campaignId: selectedCampaignGlobal ? selectedCampaignGlobal.id : null,
        campaignName: selectedCampaignGlobal ? selectedCampaignGlobal.name : "",
        locationName: "",
      },
      events: {
        ...common,
        name: "New Event",
        type: "",
        sessionId: null,
        sessionName: "",
        description: "",
      },
      playerCharacters: {
        ...common,
        name: "New Player Character",
        class: "",
        level: 1,
        race: "",
        notes: "",
      },
      npcs: {
        ...common,
        name: "New NPC",
        role: "",
        faction: "",
        notes: "",
      },
      encounters: {
        ...common,
        name: "New Encounter",
        challengeRating: "",
        sessionId: null,
        sessionName: "",
        description: "",
      },
      quests: {
        ...common,
        name: "New Quest",
        status: "Open",
        priority: "Normal",
        description: "",
      },
      locations: {
        ...common,
        name: "New Location",
        type: "",
        region: "",
        description: "",
        city: "",
        state: "",
        zip: "",
      },
      items: {
        ...common,
        name: "New Item",
        rarity: "",
        owner: "",
        description: "",
      },
      lore: {
        ...common,
        title: "New Lore",
        category: "",
        scope: "",
        body: "",
        secrets: "",
      },
      logs: {
        ...common,
        sessionName: "",
        date: "",
        summary: "",
        body: "",
      },
    };

    const newRecord = newItemByType[activeType];
    if (!newRecord) return;

    if (activeType === "campaigns") {
      setSelectedCampaignGlobal(newRecord);
    }

    setData((prev) => ({
      ...prev,
      [activeType]: [newRecord, ...prev[activeType]],
    }));

    setSelectedRecord(newRecord);
    setSaveStatus("unsaved");
  };

  // ---------------------------------------------
  // DELETE / ARCHIVE
  // ---------------------------------------------
  const handleDelete = async () => {
    if (!selectedRecord) return;
    if (!window.confirm("Delete this record? This cannot be undone.")) return;

    try {
      await apiFetch(activeType, {
        method: "DELETE",
        body: { id: selectedRecord.id },
      });

      setData((prev) => ({
        ...prev,
        [activeType]: prev[activeType].filter(
          (r) => r.id !== selectedRecord.id
        ),
      }));

      if (activeType === "campaigns") {
        if (selectedCampaignGlobal?.id === selectedRecord.id) {
          setSelectedCampaignGlobal(null);
        }
      }

      setSelectedRecord(null);
      setSaveStatus("idle");
    } catch (err) {
      console.error("Delete error:", err);
      setSaveStatus("error");
    }
  };

  // ---------------------------------------------
  // DERIVED VIEW: list + columns
  // ---------------------------------------------
  const currentList = data[activeType] || [];
  const columns = LIST_COLUMNS[activeType] || ["name"];

  const formattedList = useMemo(
    () =>
      currentList.map((record) => {
        const row = { id: record.id, raw: record };
        columns.forEach((col) => {
          row[col] = record[col] || "";
        });
        return row;
      }),
    [currentList, columns]
  );

  if (activeType === "sessions" && selectedCampaignGlobal) {
    const filtered = formattedList.filter(
      (row) => row.raw.campaignId === selectedCampaignGlobal.id
    );
    if (filtered.length > 0) {
      formattedList.splice(0, formattedList.length, ...filtered);
    }
  }

  const filteredList = currentList;

  return (
    <div className="cm-root lw-cm-root">
      {/* ========== SIDEBAR ========== */}
      <div className="lw-cm-sidebar">
        <div className="lw-cm-sidebar-header">
          <div className="lw-cm-title">CAMPAIGN MANAGER</div>
          <div className="lw-cm-subtitle">MU/TH/UR CONTROL PANEL</div>
        </div>

        <div className="lw-cm-sidebar-section">
          <div className="lw-cm-sidebar-label">CONTAINERS</div>
          <div className="lw-cm-tablist">
            {CONTAINER_TYPES.map((tab) => (
              <button
                key={tab.id}
                className={
                  "lw-cm-tab" +
                  (activeType === tab.id ? " lw-cm-tab-active" : "")
                }
                onClick={() => handleSelectType(tab.id)}
              >
                <span className="lw-cm-tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lw-cm-sidebar-section">
          <div className="lw-cm-sidebar-label">ADMIN KEY</div>
          <input
            className="lw-cm-input lw-cm-input-compact"
            placeholder="x-admin-key"
            defaultValue={ADMIN_KEY}
            onBlur={(e) => setAdminKey(e.target.value)}
          />
          <div className="lw-cm-helptext">
            Header sent as <code>{ADMIN_HEADER_KEY}</code> to all API calls.
          </div>
        </div>

        <div className="lw-cm-sidebar-section">
          <div className="lw-cm-sidebar-label">ACTIONS</div>
          <button className="lw-cm-button" onClick={handleCreate}>
            + NEW {activeType.toUpperCase()}
          </button>
          <button
            className="lw-cm-button lw-cm-button-danger"
            onClick={handleDelete}
            disabled={!selectedRecord}
          >
            DELETE
          </button>
        </div>

        <div className="lw-cm-sidebar-footer">
          <span className={`lw-cm-status lw-cm-status-${saveStatus}`}>
            {saveStatus === "idle" && "All changes synced."}
            {saveStatus === "unsaved" && "Unsaved changes..."}
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Saved."}
            {saveStatus === "error" && "Save error."}
          </span>
        </div>
      </div>

      {/* ========== MAIN PANEL ========== */}
      <div className="lw-cm-main">
        {/* CAMPAIGN SELECTOR (GLOBAL) */}
        <div className="lw-cm-main-toolbar">
          <div className="lw-cm-toolbar-group">
            <div className="lw-cm-label">Active Campaign</div>
            <select
              className="lw-cm-select"
              value={selectedCampaignGlobal ? selectedCampaignGlobal.id : ""}
              onChange={(e) => {
                const next = data.campaigns.find(
                  (c) => c.id === e.target.value
                );
                setSelectedCampaignGlobal(next || null);
                if (activeType === "sessions") {
                  setSelectedRecord(null);
                }
              }}
            >
              <option value="">-- None --</option>
              {data.campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || "(Unnamed Campaign)"}
                </option>
              ))}
            </select>
          </div>

          <div className="lw-cm-toolbar-group">
            <div className="lw-cm-label">Container</div>
            <div className="lw-cm-toolbar-container-label">
              {CONTAINER_TYPES.find((t) => t.id === activeType)?.label ||
                activeType}
            </div>
          </div>
        </div>

        {/* SPLIT LAYOUT: LIST + DETAIL */}
        <div className="lw-cm-main-split">
          {/* LEFT: LIST */}
          <div className="lw-cm-list-panel">
            <div className="lw-cm-list-header">
              <div className="lw-cm-list-title">RECORDS</div>
              <div className="lw-cm-list-count">
                {filteredList.length} total
              </div>
            </div>

            <div className="lw-cm-list-table">
              <div className="lw-cm-list-row lw-cm-list-row-header">
                <div className="lw-cm-list-cell">Name</div>
                {columns
                  .filter((c) => c !== "name")
                  .map((col) => (
                    <div
                      key={col}
                      className="lw-cm-list-cell lw-cm-list-cell-secondary"
                    >
                      {col}
                    </div>
                  ))}
              </div>

              <div className="lw-cm-list-body">
                {filteredList.length === 0 && (
                  <div className="lw-cm-list-empty">
                    No records yet. Click <strong>+ NEW</strong> to create.
                  </div>
                )}

                {filteredList.map((record) => {
                  const isActive = selectedRecord?.id === record.id;
                  return (
                    <button
                      key={record.id}
                      className={
                        "lw-cm-list-row-button" +
                        (isActive ? " lw-cm-list-row-active" : "")
                      }
                      onClick={() => handleSelectRecord(record)}
                    >
                      <div className="lw-cm-list-row">
                        <div className="lw-cm-list-cell">
                          {record.name ||
                            record.title ||
                            record.sessionName ||
                            "(Untitled)"}
                        </div>
                        {columns
                          .filter((c) => c !== "name")
                          .map((col) => (
                            <div
                              key={col}
                              className="lw-cm-list-cell lw-cm-list-cell-secondary"
                            >
                              {record[col] || ""}
                            </div>
                          ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: DETAIL */}
          <div className="lw-cm-detail-panel">
            <div className="lw-cm-detail-header">
              <div className="lw-cm-detail-title">
                {selectedRecord
                  ? selectedRecord.name ||
                    selectedRecord.title ||
                    selectedRecord.sessionName ||
                    "(Untitled)"
                  : "No record selected"}
              </div>
              <div className="lw-cm-detail-subtitle">
                {activeType.toUpperCase()}
              </div>
            </div>

            {!selectedRecord && (
              <div className="lw-cm-detail-empty">
                Select a record from the list or click <strong>+ NEW</strong>.
              </div>
            )}

            {selectedRecord && (
              <div className="lw-cm-detail-scroll">
                {/* CAMPAIGNS */}
                {activeType === "campaigns" && (
                  <>
                    <label className="lw-cm-label">Campaign Name</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.name || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          name: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">World Setting</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.worldSetting || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          worldSetting: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">Date / Era</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.date || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          date: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">Campaign Summary</label>
                    <textarea
                      className="lw-cm-textarea"
                      value={selectedRecord.description || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          description: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />
                  </>
                )}

                {/* SESSIONS */}
                {activeType === "sessions" && (
                  <>
                    <label className="lw-cm-label">Session Name</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.name || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          name: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">Session Date</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.date || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          date: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">Campaign</label>
                    <select
                      className="lw-cm-select"
                      value={selectedRecord.campaignId || ""}
                      onChange={(e) => {
                        const campaignId = e.target.value || null;
                        const campaign = data.campaigns.find(
                          (c) => c.id === campaignId
                        );
                        const updated = {
                          ...selectedRecord,
                          campaignId,
                          campaignName: campaign ? campaign.name : "",
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                        if (campaign) {
                          setSelectedCampaignGlobal(campaign);
                        }
                      }}
                    >
                      <option value="">-- None --</option>
                      {data.campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || "(Unnamed Campaign)"}
                        </option>
                      ))}
                    </select>

                    <label className="lw-cm-label">Location Name</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.locationName || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          locationName: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">Session Notes</label>
                    <textarea
                      className="lw-cm-textarea"
                      value={selectedRecord.description || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          description: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />
                  </>
                )}

                {/* EVENTS */}
                {activeType === "events" && (
                  <>
                    <label className="lw-cm-label">Event Name</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.name || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          name: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">Event Type</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.type || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          type: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">Session</label>
                    <select
                      className="lw-cm-select"
                      value={selectedRecord.sessionId || ""}
                      onChange={(e) => {
                        const sessionId = e.target.value || null;
                        const session = data.sessions.find(
                          (s) => s.id === sessionId
                        );
                        const updated = {
                          ...selectedRecord,
                          sessionId,
                          sessionName: session ? session.name : "",
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    >
                      <option value="">-- None --</option>
                      {data.sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name || "(Unnamed Session)"}
                        </option>
                      ))}
                    </select>

                    <label className="lw-cm-label">Event Description</label>
                    <textarea
                      className="lw-cm-textarea"
                      value={selectedRecord.description || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          description: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />
                  </>
                )}

                {/* LOCATIONS */}
                {activeType === "locations" && (
                  <>
                    <label className="lw-cm-label">Location Name</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.name || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          name: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">Location Type</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.type || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          type: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">Region</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.region || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          region: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">City</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.city || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          city: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">State</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.state || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          state: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">ZIP</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.zip || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          zip: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">Location Description</label>
                    <textarea
                      className="lw-cm-textarea"
                      value={selectedRecord.description || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          description: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />
                  </>
                )}

                {/* ITEMS */}
                {activeType === "items" && (
                  <>
                    <label className="lw-cm-label">Item Name</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.name || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          name: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">Rarity</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.rarity || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          rarity: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">Owner</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.owner || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          owner: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">Item Description</label>
                    <textarea
                      className="lw-cm-textarea"
                      value={selectedRecord.description || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          description: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />
                  </>
                )}

                {/* LORE */}
                {activeType === "lore" && (
                  <>
                    <label className="lw-cm-label">Lore Title</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.title || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          title: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">Category</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.category || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          category: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">Scope</label>
                    <input
                      className="lw-cm-input"
                      value={selectedRecord.scope || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          scope: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">Body</label>
                    <textarea
                      className="lw-cm-textarea"
                      value={selectedRecord.body || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          body: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />

                    <label className="lw-cm-label">Secrets</label>
                    <textarea
                      className="lw-cm-textarea"
                      value={selectedRecord.secrets || ""}
                      onChange={(e) => {
                        const updated = {
                          ...selectedRecord,
                          secrets: e.target.value,
                        };
                        setSelectedRecord(updated);
                        triggerAutosave(updated);
                      }}
                    />
                  </>
                )}

                {/* NPCS, ENCOUNTERS, QUESTS, LOGS, PLAYER CHARACTERS */}
                {[
                  "npcs",
                  "encounters",
                  "quests",
                  "logs",
                  "playerCharacters",
                ].includes(activeType) && (
                  <FallbackDetail
                    record={selectedRecord}
                    onChange={(updated) => {
                      setSelectedRecord(updated);
                      triggerAutosave(updated);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MU/TH/UR WARNING MODAL */}
      {showWarningModal && (
        <div className="lw-cm-modal-backdrop">
          <div className="lw-cm-modal">
            <div className="lw-cm-modal-header">MU/TH/UR WARNING</div>
            <div className="lw-cm-modal-body">
              <p>{warningMessage}</p>
            </div>
            <div className="lw-cm-modal-footer">
              <button
                className="lw-cm-button lw-cm-button-primary"
                onClick={() => setShowWarningModal(false)}
              >
                ACKNOWLEDGE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FallbackDetail({ record, onChange }) {
  if (!record) return null;

  return (
    <div className="lw-cm-detail-inner">
      <div className="lw-cm-label">Record JSON</div>
      <textarea
        className="lw-cm-textarea"
        value={JSON.stringify(record, null, 2)}
        onChange={(e) => {
          try {
            const updated = JSON.parse(e.target.value);
            onChange(updated);
          } catch (err) {
            // ignore parse errors
          }
        }}
      />
    </div>
  );
}

// If you later implement NPCs, Items, Events, Lore, Quests, Encounters, Logs,
// plug them in where needed. FallbackDetail keeps the UI from breaking.

export default CampaignManager;
