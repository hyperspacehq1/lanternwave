// /components/forms/index.js

import CampaignForm from "./CampaignForm";
import SessionForm from "./SessionForm";
import EventForm from "./EventForm";
import EncounterForm from "./EncounterForm";
import NpcForm from "./NpcForm";
import PlayerCharacterForm from "./PlayerCharacterForm";
import ItemForm from "./ItemForm";
import LocationForm from "./LocationForm";

// Specialized registry
export const FORM_REGISTRY = {
  campaigns: CampaignForm,
  sessions: SessionForm,
  events: EventForm,
  encounters: EncounterForm,
  npcs: NpcForm,

  // FIX: must match API + page entity key exactly
  "player-characters": PlayerCharacterForm,

  items: ItemForm,
  locations: LocationForm,
};

// Fallback generic renderer
function GenericFallbackForm({ record, onChange }) {
  console.warn(
    `[CampaignManager] No specialized form found for "${record?._type}". Using generic fallback form.`
  );

  return (
    <div className="cm-detail-form">
      {Object.entries(record)
        .filter(
          ([key]) =>
            !["_isNew", "_type", "id", "createdAt", "updatedAt"].includes(key)
        )
        .map(([key, value]) => (
          <div className="cm-field" key={key}>
            <label>{key.replace(/([A-Z])/g, " $1")}</label>
            <textarea
              value={value || ""}
              onChange={(e) =>
                onChange({ ...record, [key]: e.target.value })
              }
            />
          </div>
        ))}
    </div>
  );
}

// Resolver
export function getFormComponent(type) {
  return FORM_REGISTRY[type] || GenericFallbackForm;
}
