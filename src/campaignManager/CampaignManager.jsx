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

/**
 * NOTE:
 * Later you’ll replace this with fetch calls to your Netlify 2025 API
 * backed by Neon Postgres (e.g. /api/campaigns, /api/sessions, etc.).
 */
const createMockData = () => ({
  campaigns: [
    {
      id: FAKE_ID(),
      name: "Echoes of Beacon Island",
      description: "A coastal horror campaign with creeping fog and missing fishermen.",
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

  const currentList = data[activeType] || [];

  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return currentList;
    const term = searchTerm.toLowerCase();
    return currentList.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(term)
    );
  }, [currentList, searchTerm]);

  const isDetailOpen = !!selectedRecord;

  const handleCreate = () => {
    // Skeleton "Create" action per container type.
    // Later, open a modal or side form, post to API, then refresh.
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
  };

  const handleArchive = () => {
    if (!selectedRecord) return;
    setData((prev) => ({
      ...prev,
      [activeType]: prev[activeType].filter((item) => item.id !== selectedRecord.id),
    }));
    setSelectedRecord(null);
  };

  const handleRefresh = () => {
    // “Refresh” clears remembered UI state.
    setSelectedRecord(null);
    setSearchTerm("");
    setRememberStateToken(FAKE_ID());
    // You could also clear localStorage/sessionStorage here later.
  };

  const handleMetaSearchSelect = (type, record) => {
    setActiveType(type);
    setSelectedRecord(record);
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

  return (
    <div className="lw-cm-root" data-state-token={rememberStateToken}>
      <header className="lw-cm-header">
        <div className="lw-cm-header-title">
          <span className="lw-cm-header-prefix">Lanternwave</span>
          <span className="lw-cm-header-main">Campaign Manager</span>
        </div>
        <div className="lw-cm-header-actions">
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
                  }}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* CENTER: List & Google-style Search */}
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

        {/* RIGHT: Detail Container */}
        <section
          className={
            "lw-cm-detail" + (isDetailOpen ? " lw-cm-detail-open" : "")
          }
        >
          {selectedRecord ? (
            <DetailView
              type={activeType}
              record={selectedRecord}
              onChange={(updated) => {
                setSelectedRecord(updated);
                setData((prev) => ({
                  ...prev,
                  [activeType]: prev[activeType].map((r) =>
                    r.id === updated.id ? updated : r
                  ),
                }));
              }}
              onClose={() => setSelectedRecord(null)}
            />
          ) : (
            <div className="lw-cm-detail-placeholder">
              Select an item to view details
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

// Utility display helpers

function getRecordDisplayName(type, record) {
  switch (type) {
    case "campaigns":
      return record.name || "(Untitled Campaign)";
    case "sessions":
      return record.description || "(Session)";
    case "events":
      return record.description || "(Event)";
    case "playerCharacters":
      return `${record.firstName || ""} ${record.lastName || ""}`.trim() || "(Player Character)";
    case "npcs":
      return `${record.firstName || ""} ${record.lastName || ""}`.trim() || "(NPC)";
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

// DETAIL VIEW – large, easy-to-read “detail containers”

const DetailView = ({ type, record, onChange, onClose }) => {
  const updateField = (field, value) => {
    onChange({ ...record, [field]: value });
  };

  const textAreaProps = {
    rows: 4,
  };

  return (
    <div className="lw-cm-detail-inner">
      <div className="lw-cm-detail-header-row">
        <h2 className="lw-cm-detail-title">
          {getRecordDisplayName(type, record)}
        </h2>
        <button className="lw-cm-detail-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="lw-cm-detail-scroll">
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

        {type === "sessions" && (
          <>
            <DetailField
              label="Description"
              type="textarea"
              value={record.description || ""}
              onChange={(v) => updateField("description", v)}
              textAreaProps={textAreaProps}
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
            />
            <DetailField
              label="History"
              type="textarea"
              value={record.history || ""}
              onChange={(v) => updateField("history", v)}
              textAreaProps={textAreaProps}
            />
            {/* Later: multi-select for Events / Encounters tied to this campaign */}
          </>
        )}

        {type === "events" && (
          <>
            <DetailField
              label="Description"
              type="textarea"
              value={record.description || ""}
              onChange={(v) => updateField("description", v)}
              textAreaProps={textAreaProps}
            />
            <DetailSelect
              label="Type"
              value={record.type || "Normal"}
              options={["Normal", "Countdown"]}
              onChange={(v) => updateField("type", v)}
            />
            <DetailSelect
              label="Weather"
              value={record.weather || ""}
              options={[
                "",
                "Clear / Sunny",
                "Partly Cloudy",
                "Cloudy / Overcast",
                "Rain",
                "Thunderstorms",
                "Snow",
                "Sleet / Freezing Rain",
                "Windy",
                "Fog / Mist",
                "Haze / Smoke",
                "Tropical Storm / Hurricane",
              ]}
              onChange={(v) => updateField("weather", v)}
            />
            <DetailField
              label="Trigger Detail (optional)"
              type="textarea"
              value={record.triggerDetail || ""}
              onChange={(v) => updateField("triggerDetail", v)}
              textAreaProps={textAreaProps}
            />
            <DetailField
              label="Priority"
              type="number"
              value={record.priority ?? 1}
              onChange={(v) => updateField("priority", Number(v || 0))}
            />
            <DetailField
              label="Countdown Time (minutes)"
              type="number"
              value={record.countdownMinutes ?? ""}
              onChange={(v) => updateField("countdownMinutes", Number(v || 0))}
            />
            {/* Later: multi-select NPCs, Locations, Items based on campaign */}
          </>
        )}

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
              label="Phone Number (optional)"
              value={record.phone || ""}
              onChange={(v) => updateField("phone", v)}
            />
            <DetailField
              label="Email Address (optional)"
              value={record.email || ""}
              onChange={(v) => updateField("email", v)}
            />
          </>
        )}

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
            <DetailSelect
              label="Type"
              value={record.type || "neutral"}
              options={[
                "ally",
                "neutral",
                "antagonist",
                "monsters/creature",
                "faction NPC",
              ]}
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
              label="Faction / Alignment"
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
            />
            <DetailSelect
              label="State"
              value={record.state || "alive"}
              options={[
                "alive",
                "dead",
                "missing",
                "corrupted",
                "loyal",
                "misc",
              ]}
              onChange={(v) => updateField("state", v)}
            />
          </>
        )}

        {type === "encounters" && (
          <>
            <DetailField
              label="Description"
              type="textarea"
              value={record.description || ""}
              onChange={(v) => updateField("description", v)}
              textAreaProps={textAreaProps}
            />
            {/* Type: multi-select – will wire to checkboxes later */}
            <DetailField
              label="Type (combat, social, exploration, puzzle, horror/sanity checks, skill challenges)"
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
              textAreaProps={textAreaProps}
            />
            <DetailField
              label="Notes"
              type="textarea"
              value={record.notes || ""}
              onChange={(v) => updateField("notes", v)}
              textAreaProps={textAreaProps}
            />
            <DetailField
              label="Priority"
              type="number"
              value={record.priority ?? 1}
              onChange={(v) => updateField("priority", Number(v || 0))}
            />
            {/* Later: multi-select Lore, Locations, Items */}
          </>
        )}

        {type === "quests" && (
          <>
            <DetailField
              label="Description"
              type="textarea"
              value={record.description || ""}
              onChange={(v) => updateField("description", v)}
              textAreaProps={textAreaProps}
            />
            <DetailSelect
              label="Status"
              value={record.status || "active"}
              options={["active", "completed", "failed"]}
              onChange={(v) => updateField("status", v)}
            />
          </>
        )}

        {type === "locations" && (
          <>
            <DetailField
              label="Description"
              type="textarea"
              value={record.description || ""}
              onChange={(v) => updateField("description", v)}
              textAreaProps={textAreaProps}
            />
            <DetailField
              label="Street Address"
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
              label="Zip Code"
              value={record.zip || ""}
              onChange={(v) => updateField("zip", v)}
            />
            <DetailField
              label="Notes"
              type="textarea"
              value={record.notes || ""}
              onChange={(v) => updateField("notes", v)}
              textAreaProps={textAreaProps}
            />
            <DetailField
              label="Secrets"
              type="textarea"
              value={record.secrets || ""}
              onChange={(v) => updateField("secrets", v)}
              textAreaProps={textAreaProps}
            />
            <DetailField
              label="Points of Interest"
              type="textarea"
              value={record.pointsOfInterest || ""}
              onChange={(v) => updateField("pointsOfInterest", v)}
              textAreaProps={textAreaProps}
            />
            {/* Later: NPCs present multi-select */}
          </>
        )}

        {type === "items" && (
          <>
            <DetailField
              label="Description"
              type="textarea"
              value={record.description || ""}
              onChange={(v) => updateField("description", v)}
              textAreaProps={textAreaProps}
            />
            <DetailField
              label="Notes"
              type="textarea"
              value={record.notes || ""}
              onChange={(v) => updateField("notes", v)}
              textAreaProps={textAreaProps}
            />
          </>
        )}

        {type === "lore" && (
          <>
            <DetailField
              label="Description"
              type="textarea"
              value={record.description || ""}
              onChange={(v) => updateField("description", v)}
              textAreaProps={textAreaProps}
            />
            <DetailField
              label="Notes"
              type="textarea"
              value={record.notes || ""}
              onChange={(v) => updateField("notes", v)}
              textAreaProps={textAreaProps}
            />
          </>
        )}

        {type === "logs" && (
          <>
            <DetailField
              label="Title"
              value={record.title || ""}
              onChange={(v) => updateField("title", v)}
            />
            <DetailField
              label="Session Log"
              type="textarea"
              value={record.body || ""}
              onChange={(v) => updateField("body", v)}
              textAreaProps={{ rows: 12 }}
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
}) => {
  return (
    <div className="lw-cm-field">
      <label className="lw-cm-field-label">{label}</label>
      {type === "textarea" ? (
        <textarea
          className="lw-cm-field-input lw-cm-field-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
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

const DetailSelect = ({ label, value, options, onChange }) => {
  return (
    <div className="lw-cm-field">
      <label className="lw-cm-field-label">{label}</label>
      <select
        className="lw-cm-field-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt || "(none)"}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CampaignManager;
