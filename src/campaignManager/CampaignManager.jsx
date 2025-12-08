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

// Read admin key used by requireAdmin() in Netlify functions
const getAdminKey = () =>
  typeof window === "undefined"
    ? ""
    : window.localStorage.getItem("lwAdminKey") || "";
// Unified auth header for all Netlify 2025 function calls
const authHeaders = () => ({
  "x-admin-key": getAdminKey(),
});
/**
 * Map DB row -> UI shape (snake_case -> camelCase)
 */
function fromApi(type, row) {
  if (!row) return null;

  switch (type) {
    case "campaigns":
      return {
        id: row.id,
        name: row.name || "",
        description: row.description || "",
        worldSetting: row.world_setting || "",
        date: row.campaign_date || "",
      };

    case "sessions":
      return {
        id: row.id,
        campaignId: row.campaign_id,
        description: row.description || "",
        geography: row.geography || "",
        notes: row.notes || "",
        history: row.history || "",
      };

    case "locations":
      return {
        id: row.id,
        description: row.description || "",
        street: row.street || "",
        city: row.city || "",
        state: row.state || "",
        zip: row.zip || "",
        notes: row.notes || "",
        secrets: row.secrets || "",
        pointsOfInterest: row.points_of_interest || "",
      };

    default:
      // For entities not yet normalized, just pass through
      return { ...row };
  }
}

/**
 * Map UI record -> payload expected by Netlify 2025 functions (camelCase -> snake_case)
 */
function toApi(type, record) {
  switch (type) {
    case "campaigns":
      return {
        name: record.name,
        description: record.description,
        world_setting: record.worldSetting,
        campaign_date: record.date || null,
      };

    case "sessions":
      return {
        campaign_id: record.campaignId,
        description: record.description,
        geography: record.geography,
        notes: record.notes,
        history: record.history,
      };

    case "locations":
      return {
        description: record.description,
        street: record.street,
        city: record.city,
        state: record.state,
        zip: record.zip,
        notes: record.notes,
        secrets: record.secrets,
        points_of_interest: record.pointsOfInterest,
      };

    default: {
      // For now, just strip the _isNew flag and send everything else
      const { _isNew, ...rest } = record;
      return rest;
    }
  }
}
export default function CampaignManager() {
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
  // LOAD INITIAL DATA FROM NETLIFY 2025 FUNCTIONS
  // ---------------------------------------------
  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    const adminKey = getAdminKey();
    const headers = adminKey ? { "x-admin-key": adminKey } : {};

    try {
      // 1) Load campaigns
    const campaignsRes = await fetch(API_ENDPOINTS.campaigns, {
  headers: {
    ...headers,
    ...authHeaders(),
  },
});
      if (campaignsRes.ok) {
        const rows = await campaignsRes.json();
        const campaigns = rows.map((r) => fromApi("campaigns", r));

        setData((prev) => ({ ...prev, campaigns }));

        if (campaigns.length > 0) {
          setSelectedCampaignGlobal(campaigns[0]);
        }
      }
    } catch (err) {
      console.error("Error loading campaigns:", err);
    }
  }

  // once a campaign is selected, load sessions for that campaign
  useEffect(() => {
    if (selectedCampaignGlobal?.id) {
      loadSessionsForCampaign(selectedCampaignGlobal.id);
    }
  }, [selectedCampaignGlobal]);

  async function loadSessionsForCampaign(campaignId) {
    const adminKey = getAdminKey();
    const headers = adminKey ? { "x-admin-key": adminKey } : {};

    try {
      const res = await fetch(
  `${API_ENDPOINTS.sessions}?campaign_id=${encodeURIComponent(campaignId)}`,
  {
    headers: {
      ...headers,
      ...authHeaders(),
    },
  }
);
      if (!res.ok) return;

      const rows = await res.json();
      const sessions = rows.map((r) => fromApi("sessions", r));

      setData((prev) => ({ ...prev, sessions }));
    } catch (err) {
      console.error("Error loading sessions:", err);
    }
  }

  // ---------------------------------------------
  // AUTOSAVE ENGINE
  // ---------------------------------------------
  const triggerAutosave = (updatedRecord) => {
    setSaveStatus("unsaved");

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = setTimeout(() => {
      saveRecord(updatedRecord);
    }, 400);
  };

  async function saveRecord(record) {
    if (!record) return;
    setSaveStatus("saving");

    const adminKey = getAdminKey();
    const headers = {
      "Content-Type": "application/json",
      ...(adminKey ? { "x-admin-key": adminKey } : {}),
    };

    const endpoint = API_ENDPOINTS[activeType];
    if (!endpoint) {
      console.warn("No API endpoint for type:", activeType);
      return;
    }

    const isNew = record._isNew || !record.id;
    const payload = toApi(activeType, record);

    try {
      const url = isNew
        ? endpoint // POST
        : `${endpoint}?id=${encodeURIComponent(record.id)}`; // PUT

      const method = isNew ? "POST" : "PUT";
const res = await fetch(url, {
  method,
  headers: {
    ...headers,
    ...authHeaders(),
  },
  body: JSON.stringify(payload),
});
      if (!res.ok) {
        console.error("Save failed:", res.status, await res.text());
        setSaveStatus("error");
        return;
      }

      const saved = await res.json();
      const normalized = fromApi(activeType, saved);

      // Update local state with saved record
      setData((prev) => ({
        ...prev,
        [activeType]: prev[activeType].map((item) =>
          item.id === normalized.id ? normalized : item
        ),
      }));

      setSaveStatus("saved");
      setSelectedRecord(normalized);
    } catch (err) {
      console.error("Autosave error:", err);
      setSaveStatus("error");
    }
  }

  // ---------------------------------------------
  // HANDLE SIDEBAR SWITCHING
  // ---------------------------------------------
  const handleSelectType = (typeId) => {
    // Prevent selecting sessions unless a campaign exists
    if (typeId === "sessions" && !selectedCampaignGlobal) {
      showCampaignWarning();
      return;
    }

    setActiveType(typeId);
    setSelectedRecord(null);
  };

  // ---------------------------------------------
  // CREATE NEW RECORD
  // ---------------------------------------------
  const handleCreate = () => {
    // sessions require a selected campaign
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
        campaignId: selectedCampaignGlobal?.id || null,
        description: "New Session",
        geography: "",
        notes: "",
        history: "",
      },
      events: { ...common, description: "", eventType: "", weather: "" },
      playerCharacters: { ...common, name: "New Character" },
      npcs: { ...common, name: "New NPC" },
      encounters: { ...common, description: "" },
      quests: { ...common, title: "New Quest" },
      locations: {
        ...common,
        description: "",
        street: "",
        city: "",
        state: "",
        zip: "",
        notes: "",
        secrets: "",
        pointsOfInterest: "",
      },
      items: { ...common, name: "New Item" },
      lore: { ...common, title: "New Lore" },
      logs: { ...common, content: "" },
    };

    const newItem = newItemByType[activeType];
    if (!newItem) return;

    // Auto-set selectedRecord + append to data list
    setData((prev) => ({
      ...prev,
      [activeType]: [newItem, ...prev[activeType]],
    }));

    setSelectedRecord(newItem);

    // If a new campaign is created, set global campaign
    if (activeType === "campaigns") {
      setSelectedCampaignGlobal(newItem);
    }
  };

  // ---------------------------------------------
  // SELECTING A RECORD
  // ---------------------------------------------
  const handleSelectRecord = (item) => {
    if (activeType === "sessions" && !selectedCampaignGlobal) {
      showCampaignWarning();
      return;
    }

    // sessions must match selected campaign
    if (
      activeType === "sessions" &&
      item.campaignId !== selectedCampaignGlobal?.id
    ) {
      showCampaignWarning();
      return;
    }

    setSelectedRecord(item);

    // update global campaign when selecting a campaign
    if (activeType === "campaigns") {
      setSelectedCampaignGlobal(item);
    }
  };

  // ---------------------------------------------
  // FILTERED LIST
  // ---------------------------------------------
  let currentList = data[activeType] || [];

  if (activeType === "sessions" && selectedCampaignGlobal) {
    currentList = currentList.filter(
      (s) => s.campaignId === selectedCampaignGlobal.id
    );
  }

  const filteredList = currentList; // can add search later
return (
  <div className="cm-root lw-cm-root">
    {/* ========== SIDEBAR ========== */}
    <div className="lw-cm-sidebar">
      <div className="lw-cm-sidebar-header">CAMPAIGN MANAGER</div>

      {CONTAINER_TYPES.map((t) => (
        <button
          key={t.id}
          className={
            "lw-cm-sidebar-item" +
            (t.id === activeType ? " lw-cm-sidebar-item-active" : "")
          }
          onClick={() => handleSelectType(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>

    {/* ========== MAIN PANEL ========== */}
    <div className="lw-cm-main">

      {/* Top controls */}
      <div className="lw-cm-main-header">
        <h2 className="lw-cm-title">
          {activeType.charAt(0).toUpperCase() + activeType.slice(1)}
        </h2>

        <div className="lw-cm-header-controls">
          {saveStatus === "unsaved" && (
            <span className="lw-cm-status lw-cm-status-unsaved">● Unsaved</span>
          )}
          {saveStatus === "saving" && (
            <span className="lw-cm-status lw-cm-status-saving">● Saving…</span>
          )}
          {saveStatus === "saved" && (
            <span className="lw-cm-status lw-cm-status-saved">● Saved</span>
          )}
          {saveStatus === "error" && (
            <span className="lw-cm-status lw-cm-status-error">● Error</span>
          )}

          <button className="lw-cm-button" onClick={handleCreate}>
            + Create
          </button>
        </div>
      </div>

      {/* Layout split: List (left) + Detail (right) */}
      <div className="lw-cm-content">
        {/* ========== LIST PANEL ========== */}
        <div className="lw-cm-list">
          {filteredList.length === 0 && (
            <div className="lw-cm-list-empty">No records found.</div>
          )}

          {filteredList.map((item) => (
            <div
              key={item.id}
              className={
                "lw-cm-list-item" +
                (selectedRecord?.id === item.id
                  ? " lw-cm-list-item-selected"
                  : "")
              }
              onClick={() => handleSelectRecord(item)}
            >
              <div className="lw-cm-list-title">
                {item.name || item.title || item.description || "(Untitled)"}
              </div>

              {/* Session association preview */}
              {activeType === "sessions" && (
                <div className="lw-cm-list-sub">
                  Linked to Campaign #{item.campaignId}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ========== DETAIL PANEL ========== */}
        <div className="lw-cm-detail">

          {!selectedRecord && (
            <div className="lw-cm-detail-empty">
              Select or create a {activeType.slice(0, -1)} to begin.
            </div>
          )}

          {selectedRecord && (
            <div className="lw-cm-detail-inner">
              {/* ------ CAMPAIGNS ------ */}
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

                  <label className="lw-cm-label">Date</label>
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

                  <label className="lw-cm-label">Description</label>
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

              {/* ------ SESSIONS ------ */}
              {activeType === "sessions" && (
                <>
                  <label className="lw-cm-label">Description</label>
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

                  <label className="lw-cm-label">Geography</label>
                  <input
                    className="lw-cm-input"
                    value={selectedRecord.geography || ""}
                    onChange={(e) => {
                      const updated = {
                        ...selectedRecord,
                        geography: e.target.value,
                      };
                      setSelectedRecord(updated);
                      triggerAutosave(updated);
                    }}
                  />

                  <label className="lw-cm-label">Notes</label>
                  <textarea
                    className="lw-cm-textarea"
                    value={selectedRecord.notes || ""}
                    onChange={(e) => {
                      const updated = {
                        ...selectedRecord,
                        notes: e.target.value,
                      };
                      setSelectedRecord(updated);
                      triggerAutosave(updated);
                    }}
                  />

                  <label className="lw-cm-label">History</label>
                  <textarea
                    className="lw-cm-textarea"
                    value={selectedRecord.history || ""}
                    onChange={(e) => {
                      const updated = {
                        ...selectedRecord,
                        history: e.target.value,
                      };
                      setSelectedRecord(updated);
                      triggerAutosave(updated);
                    }}
                  />
                </>
              )}

              {/* ------ LOCATIONS ------ */}
              {activeType === "locations" && (
                <>
                  <label className="lw-cm-label">Description</label>
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

                  <label className="lw-cm-label">Street</label>
                  <input
                    className="lw-cm-input"
                    value={selectedRecord.street || ""}
                    onChange={(e) => {
                      const updated = {
                        ...selectedRecord,
                        street: e.target.value,
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

                  <label className="lw-cm-label">Notes</label>
                  <textarea
                    className="lw-cm-textarea"
                    value={selectedRecord.notes || ""}
                    onChange={(e) => {
                      const updated = {
                        ...selectedRecord,
                        notes: e.target.value,
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

                  <label className="lw-cm-label">Points of Interest</label>
                  <textarea
                    className="lw-cm-textarea"
                    value={selectedRecord.pointsOfInterest || ""}
                    onChange={(e) => {
                      const updated = {
                        ...selectedRecord,
                        pointsOfInterest: e.target.value,
                      };
                      setSelectedRecord(updated);
                      triggerAutosave(updated);
                    }}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ========== MU/TH/UR WARNING MODAL ========== */}
    {showWarningModal && (
      <div className="lw-cm-modal-overlay">
        <div className="lw-cm-modal">
          <div className="lw-cm-modal-header">
            <span className="lw-cm-modal-prefix">MU/TH/UR 182</span>
            <span className="lw-cm-modal-title">SYSTEM NOTICE</span>
          </div>

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
} // <-- closes the CampaignManager() component
export default CampaignManager;
