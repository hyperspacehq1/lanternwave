import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/gm/sessions-joins?campaign_id=
------------------------------------------------------------ */
export async function GET(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = ctx.tenantId;
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id");

  if (!campaignId) {
    return Response.json(
      { error: "campaign_id required" },
      { status: 400 }
    );
  }

  const result = {
    encounters: {},
    events: {},
    locations: {},
  };

  /* -------------------------------
     Encounters ↔ Sessions
  -------------------------------- */
  const encounters = await query(
    `
    SELECT se.encounter_id, se.session_id
    FROM session_encounters se
    JOIN encounters e ON e.id = se.encounter_id
    WHERE se.tenant_id = $1
      AND e.campaign_id = $2
      AND se.deleted_at IS NULL
    `,
    [tenantId, campaignId]
  );

  for (const row of encounters.rows) {
    const k = String(row.encounter_id);
    if (!result.encounters[k]) result.encounters[k] = [];
    result.encounters[k].push(String(row.session_id));
  }

  /* -------------------------------
     Events ↔ Sessions
  -------------------------------- */
  const events = await query(
    `
    SELECT se.event_id, se.session_id
    FROM session_events se
    JOIN events e ON e.id = se.event_id
    WHERE se.tenant_id = $1
      AND e.campaign_id = $2
      AND se.deleted_at IS NULL
    `,
    [tenantId, campaignId]
  );

  for (const row of events.rows) {
    const k = String(row.event_id);
    if (!result.events[k]) result.events[k] = [];
    result.events[k].push(String(row.session_id));
  }

  /* -------------------------------
     Locations ↔ Sessions
  -------------------------------- */
  const locations = await query(
    `
    SELECT sl.location_id, sl.session_id
    FROM session_locations sl
    JOIN locations l ON l.id = sl.location_id
    WHERE sl.tenant_id = $1
      AND l.campaign_id = $2
      AND sl.deleted_at IS NULL
    `,
    [tenantId, campaignId]
  );

  for (const row of locations.rows) {
    const k = String(row.location_id);
    if (!result.locations[k]) result.locations[k] = [];
    result.locations[k].push(String(row.session_id));
  }

  return Response.json(result);
}
