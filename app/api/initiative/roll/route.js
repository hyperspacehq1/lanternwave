import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   Dice helpers
------------------------------------------------------------ */
function roll(max) {
  return Math.floor(Math.random() * max) + 1;
}

function rollInitiative(rollType) {
  switch (rollType) {
    case "1d6":
      return roll(6);
    case "2d6":
      return roll(6) + roll(6);
    case "1d8":
      return roll(8);
    case "1d10":
      return roll(10);
    case "1d20":
      return roll(20);
    default:
      throw new Error("Invalid roll_type");
  }
}

/* -----------------------------------------------------------
   POST /api/initiative/roll
   Rolls initiative for ALL non-hidden players in a campaign.
   Body: { campaign_id, roll_type }
------------------------------------------------------------ */
export async function POST(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = ctx.tenantId;
  const body = await req.json();

  const { campaign_id: campaignId, roll_type: rollType, exclude_player_ids: excludeIds } = body;

  if (!campaignId || !rollType) {
    return Response.json(
      { error: "campaign_id and roll_type are required" },
      { status: 400 }
    );
  }

  // IDs of hidden players sent from the client (localStorage)
  const excludeList = Array.isArray(excludeIds) ? excludeIds : [];

  try {
    await query("BEGIN");

    /* -------------------------------------------------------
       Load all players in the campaign, excluding hidden ones
    ------------------------------------------------------- */
    const playersRes = await query(
      `
      SELECT
        id,
        character_name,
        name,
        initiative_score,
        initiative_bonus,
        initiative_current
      FROM players
      WHERE tenant_id = $1
        AND campaign_id = $2
        AND deleted_at IS NULL
        AND ($3::uuid[] IS NULL OR id != ALL($3::uuid[]))
      `,
      [tenantId, campaignId, excludeList.length ? excludeList : null]
    );

    if (!playersRes.rows.length) {
      await query("ROLLBACK");
      return Response.json({ error: "No visible players found" }, { status: 404 });
    }

    const results = [];

    for (const player of playersRes.rows) {
      const startingInitiative =
        (player.initiative_score || 0) + (player.initiative_bonus || 0);

      const diceRoll = rollInitiative(rollType);
      const initiativeCurrent = startingInitiative + diceRoll;

      const displayName =
        player.character_name || player.name || "Unknown";

      /* -------------------------------------------------------
         Update initiative_current in players table
      ------------------------------------------------------- */
      await query(
        `
        UPDATE players
           SET initiative_current = $1,
               updated_at = NOW()
         WHERE tenant_id = $2
           AND id = $3
           AND deleted_at IS NULL
        `,
        [initiativeCurrent, tenantId, player.id]
      );

      results.push({
        player_id: player.id,
        name: displayName,
        roll: diceRoll,
        starting_initiative: startingInitiative,
        initiative_current: initiativeCurrent,
      });
    }

    await query("COMMIT");

    return Response.json({
      ok: true,
      roll_type: rollType,
      players: results,
    });
  } catch (e) {
    await query("ROLLBACK");
    return Response.json({ error: e.message }, { status: 500 });
  }
}