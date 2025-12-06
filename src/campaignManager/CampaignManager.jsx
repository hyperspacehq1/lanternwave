// src/campaignManager/CampaignManager.jsx
import React, { useState, useMemo } from "react";
import "./campaignManager.css";

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

const FAKE_ID = () => Math.random().toString(36).substring(2, 10);

const createMockData = () => ({
  campaigns: [
    {
      id: FAKE_ID(),
      name: "Echoes of Beacon Island",
      description:
        "A coastal horror campaign with creeping fog and missing fishermen.",
      worldSetting: "1920s New England",
      date: "11/29/2025",
    },
  ],
  sessions: [
    {
      id: FAKE_ID(),
      campaignId: "",
      description: "Session 1: The Ferry to Beacon Island",
      geography: "Harbor, ferry, shoreline",
      notes: "Open with the fog rolling in...",
      history: "Player intro session.",
      events: [],
      encounters: [],
    },
  ],
  events: [
    {
      id: FAKE_ID(),
      description: "Fog Horn Malfunction",
      type: "Normal",
      weather: "Fog / Mist",
      triggerDetail: "",
      npcs: [],
      locations: [],
      items: [],
      priority: 3,
      countdownMinutes: null,
    },
  ],
  playerCharacters: [],
  npcs: [],
  encounters: [],
  quests: [],
  locations: [],
  items: [],
  lore: [],
  logs: [],
});

/* Collapsible section for detail view */
const CMSection = ({ title, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <section className="lw-cm-section">
      <header
        className="lw-cm-section-header"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{title}</span>
        <span className="lw-cm-section-toggle">{open ? "▲" : "▼"}</span>
      </header>
      <div
        className={
          "lw-cm-section-content" + (open ? " lw-cm-section-content-open" : "")
        }
      >
        {children}
      </div>
    </section>
  );
};

const CampaignManager = () => {
  const [data, setData] = useState(createMockData);
  const [activeType, setActiveType] = useState("campaigns");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [rememberStateToken] = useState(FAKE_ID());
  const [isDirty, setIsDirty] = useState(false);

  // fullscreen MU-TH-UR focus editor
  const [focusEditor, setFocusEditor] = useState(null); // { label, value, onChange }

  const currentList = data[activeType] || [];

  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return currentList;
    const term = searchTerm.toLowerCase();
    return currentList.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(term)
    );
  }, [currentList, searchTerm]);

  const metaSearchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    const results = [];
    CONTAINER_TYPES.forEach((t) => {
      const list = data[t.id] || [];
      list.forEach((record) => {
        const haystack = JSON.stringify(record).toLowerCase();
        if (haystack.includes(term)) {
          results.push({
            typeId: t.id,
            typeLabel: t.label,
            record,
          });
        }
      });
    });
    return results.slice(0, 10);
  }, [searchTerm, data]);

  const isDetailOpen = !!selectedRecord;

  const handleCreate = () => {
    const common = { id: FAKE_ID() };

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
        description: "New Session",
        geography: "",
        notes: "",
        history: "",
        events: [],
        encounters: [],
      },
      events: {
        ...common,
        description: "New Event",
        type: "Normal",
        weather: "",
        triggerDetail: "",
        npcs: [],
        locations: [],
        items: [],
        priority: 1,
        countdownMinutes: null,
      },
      playerCharacters: {
        ...common,
        firstName: "New",
        lastName: "PC",
        phone: "",
        email: "",
      },
      npcs: {
        ...common,
        firstName: "New",
        lastName: "NPC",
        type: "neutral",
        data: "",
        personality: "",
        goals: "",
        factionAlignment: "",
        secrets: "",
        state: "alive",
      },
      encounters: {
        ...common,
        description: "New Encounter",
        types: [],
        notes: "",
        priority: 1,
        lore: [],
        locations: [],
        items: [],
      },
      quests: {
        ...common,
        description: "New Quest / Mission",
        status: "active",
      },
      locations: {
        ...common,
        description: "New Location",
        street: "",
        city: "",
        state: "",
        zip: "",
        notes: "",
        secrets: "",
        pointsOfInterest: "",
      },
      items: {
        ...common,
        description: "New Item / Artifact",
        notes: "",
      },
      lore: {
        ...common,
        description: "New Lore / Secret",
        notes: "",
      },
      logs: {
        ...common,
        title: "New Session Log",
        body: "",
      },
    };

    const newItem = newItemByType[activeType];
    setData((prev) => ({
      ...prev,
      [activeType]: [...prev[activeType], newItem],
    }));
    setSelectedRecord(newItem);
    setIsDirty(false);
  };

  const handleArchive = () => {
    if (!selectedRecord) return;
    setData((prev) => ({
      ...prev,
      [activeType]: prev[activeType].filter(
        (item) => item.id !== selectedRecord.id
      ),
    }));
    setSelectedRecord(null);
    setIsDirty(false);
  };

  const handleRefresh = () => {
    setSearchTerm("");
    setSelectedRecord(null);
    setIsDirty(false);
  };

  const handleMetaSearchSelect = (typeId, record) => {
    setActiveType(typeId);
    setSelectedRecord(record);
    setIsDirty(false);
  };

  const openFocusEditor = ({ label, value, onChange }) => {
    setFocusEditor({ label, value, onChange });
  };

  return (
    <div
      className="cm-root lw-cm-root"
      data-state-token={rememberStateToken}
    >
      {/* Header - matches Lanternwave app hierarchy but slightly smaller */}
      <header className="lw-cm-header">
        <div className="lw-cm-header-title">
          <span className="lw-cm-header-prefix">Lanternwave</span>
          <span className="lw-cm-header-main">Campaign Manager</span>
        </div>
        <div className="lw-cm-header-actions">
          {isDirty && <span className="lw-cm-unsaved-dot">● Unsaved</span>}
          <button className="lw-cm-button" onClick={handleRefresh}>
            Refresh
          </button>
        </div>
      </header>

      <div
        className={
          "lw-cm-layout" + (isDetailOpen ? " lw-cm-layout-detail-open" : "")
        }
      >
        {/* LEFT: Sidebar */}
        <aside className="lw-cm-sidebar">
          <div className="lw-cm-sidebar-section">
            <div className="lw-cm-sidebar-label">Containers</div>
            <nav className="lw-cm-sidebar-nav">
              {CONTAINER_TYPES.map((t) => (
                <button
                  key={t.id}
                  className={
                    "lw-cm-sidebar-item" +
                    (t.id === activeType ? " lw-cm-sidebar-item-active" : "")
                  }
                  onClick={() => {
                    setActiveType(t.id);
                    setSelectedRecord(null);
                    setIsDirty(false);
                  }}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* CENTER: Search + List */}
        <main className="lw-cm-main">
          <section className="lw-cm-search-section">
            <div className="lw-cm-search-bar">
              <input
                type="text"
                placeholder="Search campaigns, sessions, NPCs, locations, events, items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {searchTerm.trim() && metaSearchResults.length > 0 && (
              <div className="lw-cm-meta-results">
                <div className="lw-cm-meta-results-title">
                  Meta Results (jump to container)
                </div>
                <ul>
                  {metaSearchResults.map((r) => (
                    <li key={`${r.typeId}-${r.record.id}`}>
                      <button
                        className="lw-cm-meta-result"
                        onClick={() =>
                          handleMetaSearchSelect(r.typeId, r.record)
                        }
                      >
                        <span className="lw-cm-meta-result-type">
                          {r.typeLabel}
                        </span>
                        <span className="lw-cm-meta-result-text">
                          {getRecordDisplayName(r.typeId, r.record)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="lw-cm-list-section">
            <div className="lw-cm-list-header">
              <h2 className="lw-cm-list-title">
                {CONTAINER_TYPES.find((t) => t.id === activeType)?.label}
              </h2>
              <div className="lw-cm-list-actions">
                <button className="lw-cm-button" onClick={handleCreate}>
                  Create
                </button>
                <button
                  className="lw-cm-button lw-cm-button-ghost lw-cm-button-danger"
                  onClick={handleArchive}
                  disabled={!selectedRecord}
                >
                  Archive
                </button>
              </div>
            </div>

            <div className="lw-cm-list-body">
              {filteredList.length === 0 ? (
                <div className="lw-cm-empty-state">
                  No records yet. Click <strong>Create</strong> to add one.
                </div>
              ) : (
                <ul className="lw-cm-card-list">
                  {filteredList.map((item) => (
                    <li key={item.id}>
                      <button
                        className={
                          "lw-cm-card" +
                          (selectedRecord && selectedRecord.id === item.id
                            ? " lw-cm-card-active"
                            : "")
                        }
                        onClick={() => setSelectedRecord(item)}
                      >
                        <div className="lw-cm-card-title">
                          {getRecordDisplayName(activeType, item)}
                        </div>
                        <div className="lw-cm-card-subtitle">
                          {getRecordSubtitle(activeType, item)}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </main>

        {/* RIGHT: Detail Panel */}
        <section
          className={
            "lw-cm-detail-panel" + (isDetailOpen ? " visible" : "")
          }
        >
          {selectedRecord ? (
            <DetailView
              type={activeType}
              record={selectedRecord}
              isDirty={isDirty}
              onChange={(updated) => {
                setSelectedRecord(updated);
                setData((prev) => ({
                  ...prev,
                  [activeType]: prev[activeType].map((r) =>
                    r.id === updated.id ? updated : r
                  ),
                }));
                setIsDirty(true);
              }}
              onClose={() => {
                setSelectedRecord(null);
                setIsDirty(false);
              }}
              onOpenFocusEditor={openFocusEditor}
            />
          ) : (
            <div className="lw-cm-detail-placeholder">
              Select an item to view details
            </div>
          )}
        </section>
      </div>

      {/* FULLSCREEN FOCUS EDITOR (MU-TH-UR / VT323) */}
      {focusEditor && (
        <div className="lw-cm-focus-overlay">
          <div className="lw-cm-focus-panel">
            <div className="lw-cm-focus-header">
              <span className="lw-cm-focus-label">{focusEditor.label}</span>
              <button
                className="lw-cm-focus-close"
                onClick={() => setFocusEditor(null)}
              >
                ✕
              </button>
            </div>
            <textarea
              className="lw-cm-focus-textarea"
              value={focusEditor.value}
              onChange={(e) => {
                const newVal = e.target.value;
                setFocusEditor((prev) => {
                  if (prev && typeof prev.onChange === "function") {
                    prev.onChange(newVal);
                  }
                  return prev ? { ...prev, value: newVal } : prev;
                });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/* -------- DETAIL VIEW -------- */

const DetailView = ({
  type,
  record,
  isDirty,
  onChange,
  onClose,
  onOpenFocusEditor,
}) => {
  const updateField = (field, value) => {
    onChange({ ...record, [field]: value });
  };

  const openBigField = (label, fieldKey) => (value, setter) => {
    onOpenFocusEditor({
      label,
      value,
      onChange: (newVal) => setter(newVal),
    });
  };

  return (
    <div className="lw-cm-detail-inner">
      <div className="lw-cm-detail-header-row">
        <div className="lw-cm-detail-header-left">
          <div className="lw-cm-breadcrumb">
            {typeLabel(type)} ▸ {getRecordDisplayName(type, record)}
          </div>
          <h2 className="lw-cm-detail-title">
            {getRecordDisplayName(type, record)}
          </h2>
        </div>
        <div className="lw-cm-detail-header-right">
          {isDirty && <span className="lw-cm-unsaved-dot">● Unsaved</span>}
          <button className="lw-cm-detail-close" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      <div className="lw-cm-detail-scroll">
        {/* CAMPAIGNS */}
        {type === "campaigns" && (
          <>
            <CMSection title="Campaign Core">
              <DetailField
                label="Campaign Name"
                value={record.name || ""}
                onChange={(v) => updateField("name", v)}
              />
              <DetailField
                label="World Setting"
                value={record.worldSetting || ""}
                onChange={(v) => updateField("worldSetting", v)}
              />
              <DetailField
                label="Date (MM/DD/YYYY)"
                value={record.date || ""}
                onChange={(v) => updateField("date", v)}
              />
            </CMSection>

            <CMSection title="Description">
              <DetailField
                type="textarea"
                value={record.description || ""}
                onChange={(v) => updateField("description", v)}
                onOpenFocusEditor={openBigField(
                  "Campaign Description",
                  "description"
                )}
                rows={5}
              />
            </CMSection>
          </>
        )}

        {/* SESSIONS */}
        {type === "sessions" && (
          <>
            <CMSection title="Session Summary">
              <DetailField
                label="Description"
                type="textarea"
                value={record.description || ""}
                onChange={(v) => updateField("description", v)}
                onOpenFocusEditor={openBigField(
                  "Session Description",
                  "description"
                )}
                rows={4}
              />
            </CMSection>
            <CMSection title="Geography">
              <DetailField
                type="textarea"
                value={record.geography || ""}
                onChange={(v) => updateField("geography", v)}
                rows={3}
              />
            </CMSection>
            <CMSection title="Notes & History">
              <DetailField
                label="Notes"
                type="textarea"
                value={record.notes || ""}
                onChange={(v) => updateField("notes", v)}
                onOpenFocusEditor={openBigField("Session Notes", "notes")}
                rows={4}
              />
              <DetailField
                label="History"
                type="textarea"
                value={record.history || ""}
                onChange={(v) => updateField("history", v)}
                onOpenFocusEditor={openBigField("Session History", "history")}
                rows={4}
              />
            </CMSection>
          </>
        )}

        {/* EVENTS */}
        {type === "events" && (
          <>
            <CMSection title="Event Description">
              <DetailField
                type="textarea"
                value={record.description || ""}
                onChange={(v) => updateField("description", v)}
                onOpenFocusEditor={openBigField("Event Description", "description")}
                rows={4}
              />
            </CMSection>
            <CMSection title="Event Details">
              <DetailField
                label="Type"
                value={record.type || ""}
                onChange={(v) => updateField("type", v)}
              />
              <DetailField
                label="Weather"
                value={record.weather || ""}
                onChange={(v) => updateField("weather", v)}
              />
              <DetailField
                label="Trigger Detail"
                type="textarea"
                value={record.triggerDetail || ""}
                onChange={(v) => updateField("triggerDetail", v)}
                rows={3}
              />
            </CMSection>
          </>
        )}

        {/* PLAYER CHARACTERS */}
        {type === "playerCharacters" && (
          <CMSection title="Player Character">
            <DetailField
              label="First Name"
              value={record.firstName || ""}
              onChange={(v) => updateField("firstName", v)}
            />
            <DetailField
              label="Last Name"
              value={record.lastName || ""}
              onChange={(v) => updateField("lastName", v)}
            />
            <DetailField
              label="Phone"
              value={record.phone || ""}
              onChange={(v) => updateField("phone", v)}
            />
            <DetailField
              label="Email"
              value={record.email || ""}
              onChange={(v) => updateField("email", v)}
            />
          </CMSection>
        )}

        {/* NPCS */}
        {type === "npcs" && (
          <>
            <CMSection title="Identity">
              <DetailField
                label="First Name"
                value={record.firstName || ""}
                onChange={(v) => updateField("firstName", v)}
              />
              <DetailField
                label="Last Name"
                value={record.lastName || ""}
                onChange={(v) => updateField("lastName", v)}
              />
              <DetailField
                label="Type"
                value={record.type || "neutral"}
                onChange={(v) => updateField("type", v)}
              />
            </CMSection>

            <CMSection title="Profile">
              <DetailField
                label="NPC Data"
                type="textarea"
                value={record.data || ""}
                onChange={(v) => updateField("data", v)}
                onOpenFocusEditor={openBigField("NPC Data", "data")}
                rows={5}
              />
              <DetailField
                label="Personality"
                type="textarea"
                value={record.personality || ""}
                onChange={(v) => updateField("personality", v)}
                rows={4}
              />
              <DetailField
                label="Goals"
                type="textarea"
                value={record.goals || ""}
                onChange={(v) => updateField("goals", v)}
                rows={4}
              />
              <DetailField
                label="Faction Alignment"
                type="textarea"
                value={record.factionAlignment || ""}
                onChange={(v) => updateField("factionAlignment", v)}
                rows={3}
              />
              <DetailField
                label="Secrets"
                type="textarea"
                value={record.secrets || ""}
                onChange={(v) => updateField("secrets", v)}
                onOpenFocusEditor={openBigField("NPC Secrets", "secrets")}
                rows={4}
              />
              <DetailField
                label="State"
                value={record.state || "alive"}
                onChange={(v) => updateField("state", v)}
              />
            </CMSection>
          </>
        )}

        {/* ENCOUNTERS */}
        {type === "encounters" && (
          <>
            <CMSection title="Encounter Description">
              <DetailField
                type="textarea"
                value={record.description || ""}
                onChange={(v) => updateField("description", v)}
                onOpenFocusEditor={openBigField(
                  "Encounter Description",
                  "description"
                )}
                rows={4}
              />
            </CMSection>
            <CMSection title="Details">
              <DetailField
                label="Types (comma separated)"
                type="textarea"
                value={record.types?.join(", ") || ""}
                onChange={(v) =>
                  updateField(
                    "types",
                    v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                rows={3}
              />
              <DetailField
                label="Notes"
                type="textarea"
                value={record.notes || ""}
                onChange={(v) => updateField("notes", v)}
                onOpenFocusEditor={openBigField("Encounter Notes", "notes")}
                rows={4}
              />
              <DetailField
                label="Priority"
                value={record.priority ?? 1}
                onChange={(v) => updateField("priority", Number(v || 0))}
              />
            </CMSection>
          </>
        )}

        {/* QUESTS */}
        {type === "quests" && (
          <>
            <CMSection title="Quest">
              <DetailField
                label="Description"
                type="textarea"
                value={record.description || ""}
                onChange={(v) => updateField("description", v)}
                onOpenFocusEditor={openBigField("Quest Description", "description")}
                rows={4}
              />
              <DetailField
                label="Status"
                value={record.status || "active"}
                onChange={(v) => updateField("status", v)}
              />
            </CMSection>
          </>
        )}

        {/* LOCATIONS */}
        {type === "locations" && (
          <>
            <CMSection title="Location Overview">
              <DetailField
                label="Description"
                type="textarea"
                value={record.description || ""}
                onChange={(v) => updateField("description", v)}
                onOpenFocusEditor={openBigField(
                  "Location Description",
                  "description"
                )}
                rows={4}
              />
            </CMSection>
            <CMSection title="Address">
              <DetailField
                label="Street"
                value={record.street || ""}
                onChange={(v) => updateField("street", v)}
              />
              <DetailField
                label="City"
                value={record.city || ""}
                onChange={(v) => updateField("city", v)}
              />
              <DetailField
                label="State"
                value={record.state || ""}
                onChange={(v) => updateField("state", v)}
              />
              <DetailField
                label="Zip"
                value={record.zip || ""}
                onChange={(v) => updateField("zip", v)}
              />
            </CMSection>
            <CMSection title="Notes & Secrets">
              <DetailField
                label="Notes"
                type="textarea"
                value={record.notes || ""}
                onChange={(v) => updateField("notes", v)}
                onOpenFocusEditor={openBigField("Location Notes", "notes")}
                rows={3}
              />
              <DetailField
                label="Secrets"
                type="textarea"
                value={record.secrets || ""}
                onChange={(v) => updateField("secrets", v)}
                onOpenFocusEditor={openBigField("Location Secrets", "secrets")}
                rows={3}
              />
              <DetailField
                label="Points of Interest"
                type="textarea"
                value={record.pointsOfInterest || ""}
                onChange={(v) => updateField("pointsOfInterest", v)}
                rows={3}
              />
            </CMSection>
          </>
        )}

        {/* ITEMS */}
        {type === "items" && (
          <>
            <CMSection title="Item">
              <DetailField
                label="Description"
                type="textarea"
                value={record.description || ""}
                onChange={(v) => updateField("description", v)}
                onOpenFocusEditor={openBigField("Item Description", "description")}
                rows={4}
              />
              <DetailField
                label="Notes"
                type="textarea"
                value={record.notes || ""}
                onChange={(v) => updateField("notes", v)}
                onOpenFocusEditor={openBigField("Item Notes", "notes")}
                rows={3}
              />
            </CMSection>
          </>
        )}

        {/* LORE */}
        {type === "lore" && (
          <>
            <CMSection title="Lore">
              <DetailField
                label="Description"
                type="textarea"
                value={record.description || ""}
                onChange={(v) => updateField("description", v)}
                onOpenFocusEditor={openBigField("Lore Description", "description")}
                rows={4}
              />
              <DetailField
                label="Notes"
                type="textarea"
                value={record.notes || ""}
                onChange={(v) => updateField("notes", v)}
                onOpenFocusEditor={openBigField("Lore Notes", "notes")}
                rows={3}
              />
            </CMSection>
          </>
        )}

        {/* LOGS */}
        {type === "logs" && (
          <>
            <CMSection title="Session Log">
              <DetailField
                label="Title"
                value={record.title || ""}
                onChange={(v) => updateField("title", v)}
              />
              <DetailField
                label="Body"
                type="textarea"
                value={record.body || ""}
                onChange={(v) => updateField("body", v)}
                onOpenFocusEditor={openBigField("Session Log Body", "body")}
                rows={6}
              />
            </CMSection>
          </>
        )}
      </div>
    </div>
  );
};

const DetailField = ({
  label,
  type = "text",
  value,
  onChange,
  onOpenFocusEditor,
  rows = 3,
}) => {
  const handleDoubleClick = () => {
    if (onOpenFocusEditor) {
      onOpenFocusEditor(value, onChange);
    }
  };

  return (
    <div className="lw-cm-field">
      {label && <label className="lw-cm-field-label">{label}</label>}
      {type === "textarea" ? (
        <textarea
          className="lw-cm-field-input lw-cm-field-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onDoubleClick={handleDoubleClick}
          rows={rows}
        />
      ) : (
        <input
          className="lw-cm-field-input"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
};

/* Utility helpers */

function typeLabel(type) {
  const t = CONTAINER_TYPES.find((c) => c.id === type);
  return t ? t.label : type;
}

function getRecordDisplayName(type, record) {
  switch (type) {
    case "campaigns":
      return record.name || "(Untitled Campaign)";
    case "sessions":
      return record.description || "(Session)";
    case "events":
      return record.description || "(Event)";
    case "playerCharacters":
      return (
        `${record.firstName || ""} ${record.lastName || ""}`.trim() ||
        "(Player Character)"
      );
    case "npcs":
      return (
        `${record.firstName || ""} ${record.lastName || ""}`.trim() || "(NPC)"
      );
    case "encounters":
      return record.description || "(Encounter)";
    case "quests":
      return record.description || "(Quest / Mission)";
    case "locations":
      return record.description || "(Location)";
    case "items":
      return record.description || "(Item / Artifact)";
    case "lore":
      return record.description || "(Lore / Secret)";
    case "logs":
      return record.title || "(Session Log)";
    default:
      return "(Record)";
  }
}

function getRecordSubtitle(type, record) {
  switch (type) {
    case "campaigns":
      return record.worldSetting || record.description || "";
    case "sessions":
      return record.geography || record.notes || "";
    case "events":
      return record.weather || "";
    case "npcs":
      return record.type || "";
    case "encounters":
      return record.types?.join(", ") || "";
    case "quests":
      return record.status || "";
    case "locations":
      return `${record.city || ""} ${record.state || ""}`.trim();
    default:
      return "";
  }
}

export default CampaignManager;
