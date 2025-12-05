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

const CampaignManager = () => {
  const [data, setData] = useState(createMockData);
  const [activeType, setActiveType] = useState("campaigns");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [rememberStateToken, setRememberStateToken] = useState(FAKE_ID());
  const [isDirty, setIsDirty] = useState(false);

  // Fullscreen focus editor state
  const [focusEditor, setFocusEditor] = useState(null);
  // focusEditor shape: { label, value, onChange }

  const currentList = data[activeType] || [];

  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return currentList;
    const term = searchTerm.toLowerCase();
    return currentList.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(term)
    );
  }, [currentList, searchTerm]);

  const activeTypeDef = CONTAINER_TYPES.find((t) => t.id === activeType);
  const activeTypeLabel =
    activeTypeDef && activeTypeDef.label ? activeTypeDef.label : activeType;

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
    setSelectedRecord(null);
    setSearchTerm("");
    setRememberStateToken(FAKE_ID());
    setIsDirty(false);
  };

  const handleMetaSearchSelect = (type, record) => {
    setActiveType(type);
    setSelectedRecord(record);
    setIsDirty(false);
  };

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

  // When a large field wants focus editor
  const openFocusEditor = ({ label, value, onChange }) => {
    setFocusEditor({ label, value, onChange });
  };

  return (
    <div className="lw-cm-root" data-state-token={rememberStateToken}>
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
        {/* LEFT: Container Navigation */}
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

        {/* MIDDLE: List / Cards */}
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
                        onClick={() => handleMetaSearchSelect(r.typeId, r.record)}
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
                  className="lw-cm-button lw-cm-button-ghost"
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
                        onClick={() => {
                          setSelectedRecord(item);
                          setIsDirty(false);
                        }}
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

        {/* RIGHT: Detail Container */}
        <section
          className={
            "lw-cm-detail-panel" + (isDetailOpen ? " visible" : "")
          }
        >
          {selectedRecord ? (
            <DetailView
              type={activeType}
              typeLabel={activeTypeLabel}
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

      {/* FULLSCREEN FOCUS EDITOR (MU/TH/UR STYLE) */}
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
                setFocusEditor((prev) =>
                  prev ? { ...prev, value: newVal } : prev
                );
                if (focusEditor.onChange) {
                  focusEditor.onChange(newVal);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/* Utility helpers */

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

/* Detail view */

const DetailView = ({
  type,
  typeLabel,
  record,
  isDirty,
  onChange,
  onClose,
  onOpenFocusEditor,
}) => {
  const updateField = (field, value) => {
    onChange({ ...record, [field]: value });
  };

  const textAreaProps = {
    rows: 4,
  };

  // Helper: for big fields that use fullscreen editor
  const focusable = (label, fieldName) => ({
    enableFocus: true,
    onOpenFocusEditor: onOpenFocusEditor
      ? ({ value, onChange }) =>
          onOpenFocusEditor({
            label,
            value,
            onChange: (newVal) => onChange(newVal),
          })
      : null,
    fieldName,
  });

  return (
    <div className="lw-cm-detail-inner">
      <div className="lw-cm-detail-header-row">
        <div className="lw-cm-detail-header-left">
          <div className="lw-cm-breadcrumb">
            {typeLabel || type} ▸ {getRecordDisplayName(type, record)}
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
            <DetailField
              label="Campaign Name"
              value={record.name || ""}
              onChange={(v) => updateField("name", v)}
            />
            <DetailField
              label="Description"
              type="textarea"
              value={record.description || ""}
              onChange={(v) => updateField("description", v)}
              textAreaProps={textAreaProps}
              enableFocus
              onOpenFocusEditor={({ value, onChange }) =>
                onOpenFocusEditor &&
                onOpenFocusEditor({
                  label: "Campaign Description",
                  value,
                  onChange,
                })
              }
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
          </>
        )}

        {/* SESSIONS */}
        {type === "sessions" && (
          <>
            <DetailField
              label="Description"
              type="textarea"
              value={record.description || ""}
              onChange={(v) => updateField("description", v)}
              textAreaProps={textAreaProps}
              enableFocus
              onOpenFocusEditor={({ value, onChange }) =>
                onOpenFocusEditor &&
                onOpenFocusEditor({
                  label: "Session Description",
                  value,
                  onChange,
                })
              }
            />
            <DetailField
              label="Geography"
              type="textarea"
              value={record.geography || ""}
              onChange={(v) => updateField("geography", v)}
              textAreaProps={textAreaProps}
            />
            <DetailField
              label="Notes"
              type="textarea"
              value={record.notes || ""}
              onChange={(v) => updateField("notes", v)}
              textAreaProps={textAreaProps}
              enableFocus
              onOpenFocusEditor={({ value, onChange }) =>
                onOpenFocusEditor &&
                onOpenFocusEditor({
                  label: "Session Notes",
                  value,
                  onChange,
                })
              }
            />
            <DetailField
              label="History"
              type="textarea"
              value={record.history || ""}
              onChange={(v) => updateField("history", v)}
              textAreaProps={textAreaProps}
              enableFocus
              onOpenFocusEditor={({ value, onChange }) =>
                onOpenFocusEditor &&
                onOpenFocusEditor({
                  label: "Session History",
                  value,
                  onChange,
                })
              }
            />
          </>
        )}

        {/* EVENTS */}
        {type === "events" && (
          <>
            <DetailField
              label="Description"
              type="textarea"
              value={record.description || ""}
              onChange={(v) => updateField("description", v)}
              textAreaProps={textAreaProps}
              enableFocus
              onOpenFocusEditor={({ value, onChange }) =>
                onOpenFocusEditor &&
                onOpenFocusEditor({
                  label: "Event Description",
                  value,
                  onChange,
                })
              }
            />
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
              textAreaProps={textAreaProps}
            />
          </>
        )}

        {/* PLAYER CHARACTERS */}
        {type === "playerCharacters" && (
          <>
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
          </>
        )}

        {/* NPCS */}
        {type === "npcs" && (
          <>
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
            <DetailField
              label="NPC Data"
              type="textarea"
              value={record.data || ""}
              onChange={(v) => updateField("data", v)}
              textAreaProps={textAreaProps}
            />
            <DetailField
              label="Personality"
              type="textarea"
              value={record.personality || ""}
              onChange={(v) => updateField("personality", v)}
              textAreaProps={textAreaProps}
            />
            <DetailField
              label="Goals"
              type="textarea"
              value={record.goals || ""}
              onChange={(v) => updateField("goals", v)}
              textAreaProps={textAreaProps}
            />
            <DetailField
              label="Faction Alignment"
              type="textarea"
              value={record.factionAlignment || ""}
              onChange={(v) => updateField("factionAlignment", v)}
              textAreaProps={textAreaProps}
            />
            <DetailField
              label="Secrets"
              type="textarea"
              value={record.secrets || ""}
              onChange={(v) => updateField("secrets", v)}
              textAreaProps={textAreaProps}
              enableFocus
              onOpenFocusEditor={({ value, onChange }) =>
                onOpenFocusEditor &&
                onOpenFocusEditor({
                  label: "NPC Secrets",
                  value,
                  onChange,
                })
              }
            />
            <DetailField
              label="State"
              value={record.state || ""}
              onChange={(v) => updateField("state", v)}
            />
          </>
        )}

        {/* ENCOUNTERS */}
        {type === "encounters" && (
          <>
            <DetailField
              label="Description"
              type="textarea"
              value={record.description || ""}
              onChange={(v) => updateField("description", v)}
              textAreaProps={textAreaProps}
              enableFocus
              onOpenFocusEditor={({ value, onChange }) =>
                onOpenFocusEditor &&
                onOpenFocusEditor({
                  label: "Encounter Description",
                  value,
                  onChange,
                })
              }
            />
            <DetailField
              label="Notes"
              type="textarea"
              value={record.notes || ""}
              onChange={(v) => updateField("notes", v)}
              textAreaProps={textAreaProps}
              enableFocus
              onOpenFocusEditor={({ value, onChange }) =>
                onOpenFocusEditor &&
                onOpenFocusEditor({
                  label: "Encounter Notes",
                  value,
                  onChange,
                })
              }
            />
          </>
        )}

        {/* QUESTS */}
        {type === "quests" && (
          <>
            <DetailField
              label="Description"
              type="textarea"
              value={record.description || ""}
              onChange={(v) => updateField("description", v)}
              textAreaProps={textAreaProps}
              enableFocus
              onOpenFocusEditor={({ value, onChange }) =>
                onOpenFocusEditor &&
                onOpenFocusEditor({
                  label: "Quest Description",
                  value,
                  onChange,
                })
              }
            />
            <DetailField
              label="Status"
              value={record.status || ""}
              onChange={(v) => updateField("status", v)}
            />
          </>
        )}

        {/* LOCATIONS */}
        {type === "locations" && (
          <>
            <DetailField
              label="Description"
              type="textarea"
              value={record.description || ""}
              onChange={(v) => updateField("description", v)}
              textAreaProps={textAreaProps}
              enableFocus
              onOpenFocusEditor={({ value, onChange }) =>
                onOpenFocusEditor &&
                onOpenFocusEditor({
                  label: "Location Description",
                  value,
                  onChange,
                })
              }
            />
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
            <DetailField
              label="Notes"
              type="textarea"
              value={record.notes || ""}
              onChange={(v) => updateField("notes", v)}
              textAreaProps={textAreaProps}
              enableFocus
              onOpenFocusEditor={({ value, onChange }) =>
                onOpenFocusEditor &&
                onOpenFocusEditor({
                  label: "Location Notes",
                  value,
                  onChange,
                })
              }
            />
            <DetailField
              label="Secrets"
              type="textarea"
              value={record.secrets || ""}
              onChange={(v) => updateField("secrets", v)}
              textAreaProps={textAreaProps}
              enableFocus
              onOpenFocusEditor={({ value, onChange }) =>
                onOpenFocusEditor &&
                onOpenFocusEditor({
                  label: "Location Secrets",
                  value,
                  onChange,
                })
              }
            />
            <DetailField
              label="Points of Interest"
              type="textarea"
              value={record.pointsOfInterest || ""}
              onChange={(v) => updateField("pointsOfInterest", v)}
              textAreaProps={textAreaProps}
            />
          </>
        )}

        {/* ITEMS */}
        {type === "items" && (
          <>
            <DetailField
              label="Description"
              type="textarea"
              value={record.description || ""}
              onChange={(v) => updateField("description", v)}
              textAreaProps={textAreaProps}
              enableFocus
              onOpenFocusEditor={({ value, onChange }) =>
                onOpenFocusEditor &&
                onOpenFocusEditor({
                  label: "Item Description",
                  value,
                  onChange,
                })
              }
            />
            <DetailField
              label="Notes"
              type="textarea"
              value={record.notes || ""}
              onChange={(v) => updateField("notes", v)}
              textAreaProps={textAreaProps}
              enableFocus
              onOpenFocusEditor={({ value, onChange }) =>
                onOpenFocusEditor &&
                onOpenFocusEditor({
                  label: "Item Notes",
                  value,
                  onChange,
                })
              }
            />
          </>
        )}

        {/* LORE */}
        {type === "lore" && (
          <>
            <DetailField
              label="Description"
              type="textarea"
              value={record.description || ""}
              onChange={(v) => updateField("description", v)}
              textAreaProps={textAreaProps}
              enableFocus
              onOpenFocusEditor={({ value, onChange }) =>
                onOpenFocusEditor &&
                onOpenFocusEditor({
                  label: "Lore Description",
                  value,
                  onChange,
                })
              }
            />
            <DetailField
              label="Notes"
              type="textarea"
              value={record.notes || ""}
              onChange={(v) => updateField("notes", v)}
              textAreaProps={textAreaProps}
              enableFocus
              onOpenFocusEditor={({ value, onChange }) =>
                onOpenFocusEditor &&
                onOpenFocusEditor({
                  label: "Lore Notes",
                  value,
                  onChange,
                })
              }
            />
          </>
        )}

        {/* LOGS */}
        {type === "logs" && (
          <>
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
              textAreaProps={textAreaProps}
              enableFocus
              onOpenFocusEditor={({ value, onChange }) =>
                onOpenFocusEditor &&
                onOpenFocusEditor({
                  label: "Session Log Body",
                  value,
                  onChange,
                })
              }
            />
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
  textAreaProps = {},
  enableFocus,
  onOpenFocusEditor,
}) => {
  const handleDoubleClick = () => {
    if (enableFocus && onOpenFocusEditor) {
      onOpenFocusEditor({ value, onChange });
    }
  };

  return (
    <div className="lw-cm-field">
      <label className="lw-cm-field-label">{label}</label>
      {type === "textarea" ? (
        <textarea
          className="lw-cm-field-input lw-cm-field-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onDoubleClick={handleDoubleClick}
          {...textAreaProps}
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

export default CampaignManager;
