/* ---------------------------------------------------
   CREATE EVENT (mission-scoped)
--------------------------------------------------- */
export async function createEvent({
  mission_id,
  event_type,
  location,
  description,
  goal,
  item,
}) {
  return apiFetch("/api-events", {
    method: "POST",
    body: JSON.stringify({
      mission_id,
      event_type,
      payload: {
        location,
        description,
        goal,
        item,
      },
    }),
  });
}

/* ---------------------------------------------------
   LOAD mission-level events
--------------------------------------------------- */
export async function listMissionEvents(mission_id) {
  return apiFetch(`/api-events?mission_id=${mission_id}`);
}

/* ---------------------------------------------------
   ARCHIVE EVENT
--------------------------------------------------- */
export async function archiveMissionEvent(mission_id, event_id) {
  return apiFetch(
    `/api-events?mission_id=${mission_id}&event_id=${event_id}`,
    { method: "DELETE" }
  );
}
