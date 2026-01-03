import CampaignForm from "./CampaignForm";
import SessionForm from "./SessionForm";
import EventForm from "./EventForm";
import EncounterForm from "./EncounterForm";
import NpcForm from "./NpcForm";
import ItemForm from "./ItemForm";
import LocationForm from "./LocationForm";
import PlayerForm from "./PlayerForm";

/* -------------------------------------------------
   Form registry
-------------------------------------------------- */
export const FORM_REGISTRY = {
  campaigns: CampaignForm,
  sessions: SessionForm,
  events: EventForm,
  encounters: EncounterForm,
  npcs: NpcForm,
  players: PlayerForm,
  items: ItemForm,
  locations: LocationForm,
};

/* -------------------------------------------------
   Generic fallback (detail pane only)
-------------------------------------------------- */
function GenericFallbackForm({ record, onChange }) {
  console.warn(
    `[CampaignManager] No specialized form found for "${record?._type}". Using generic fallback form.`
  );

  return (
    <div className="cm-detail-form">
      {Object.entries(record)
        .filter(
          ([key]) =>
            ![
              "_isNew",
              "_type",
              "id",
              "createdAt",
              "updatedAt",
              "created_at",
              "updated_at",
              "deleted_at",
              "deleted_by",
            ].includes(key)
        )
        .map(([key, value]) => (
          <div className="cm-field" key={key}>
            <label>{key.replace(/_/g, " ")}</label>
            <textarea
              className="cm-textarea"
              value={value ?? ""}
              onChange={(e) =>
                onChange({ ...record, [key]: e.target.value })
              }
            />
          </div>
        ))}
    </div>
  );
}

/* -------------------------------------------------
   ✅ REQUIRED EXPORT (this fixes the build)
-------------------------------------------------- */
export function getFormComponent(type) {
  return FORM_REGISTRY[type] || GenericFallbackForm;
}
