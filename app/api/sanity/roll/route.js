import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   Dice helpers
------------------------------------------------------------ */
function roll(max) {
  return Math.floor(Math.random() * max) + 1;
}

/* VALUE TABLE */
function computeLoss(rollType, passed) {
  switch (rollType) {
    case "1d2":
      return passed ? 0 : roll(2);
    case "1d3":
      return passed ? 0 : roll(3);
    case "1d6":
      return passed ? 1 : roll(6);
    case "1d8":
      return passed ? 2 : roll(8);
    case "1d20":
      return passed ? 6 : roll(20);
    default:
      throw new Error("Invalid roll_type");
  }
}

/* -----------------------------------------------------------
   POST /api/sanity/roll
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

  const {
    player_id: playerId,
    campaign_id: campaignId,
    roll_type: rollType,
  } = body;

  if (!playerId || !campaignId || !rollType) {
    return Response.json(
      { error: "player_id, campaign_id, and roll_type are required" },
      { status: 400 }
    );
  }

  /* ---------------------------------------------------------
     Resolve player names (for pulse)
  --------------------------------------------------------- */
  const { rows: playerRows } = await query(
    `
    SELECT id, character_name, first_name, last_name
    FROM players
    WHERE tenant_id = $1
      AND campaign_id = $2
      AND deleted_at IS NULL
    `,
    [tenantId, campaignId]
  );

  const playerNameById = {};
  for (const p of playerRows) {
    playerNameById[p.id] =
      p.character_name ||
      `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() ||
      "Unknown";
  }

  const pulsePlayers = [];

  try {
    await query("BEGIN");

    /* -------------------------------------------------------
       Load sanity row (AUTHORITATIVE SOURCE)
    ------------------------------------------------------- */
    const sanityRes = await query(
      `
      SELECT base_sanity, current_sanity
      FROM player_sanity
      WHERE tenant_id = $1
        AND campaign_id = $2
        AND player_id = $3
      LIMIT 1
      `,
      [tenantId, campaignId, playerId]
    );

    if (!sanityRes.rows.length) {
      throw new Error("Player sanity row not found");
    }

    const baseSanity = sanityRes.rows[0].base_sanity;
    const currentSanity = sanityRes.rows[0].current_sanity;

    if (!Number.isInteger(baseSanity)) {
      throw new Error("Player base sanity not set");
    }

    /* -------------------------------------------------------
       SANITY ROLL
    ------------------------------------------------------- */
    const d100 = roll(100);
    const passed = d100 < currentSanity;
    const loss = computeLoss(rollType, passed);
    const sanityAfter = Math.max(0, currentSanity - loss);

    /* -------------------------------------------------------
       Record event
    ------------------------------------------------------- */
    await query(
      `
      INSERT INTO player_sanity_events (
        id,
        tenant_id,
        campaign_id,
        player_id,
        roll_type,
        roll_success,
        sanity_loss,
        sanity_before,
        sanity_after
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
      [
        uuid(),
        tenantId,
        campaignId,
        playerId,
        rollType,
        passed,
        loss,
        currentSanity,
        sanityAfter,
      ]
    );

    /* -------------------------------------------------------
       Update sanity (CURRENT ONLY)
    ------------------------------------------------------- */
    await query(
      `
      UPDATE player_sanity
      SET current_sanity = $1,
          updated_at = NOW()
      WHERE tenant_id = $2
        AND campaign_id = $3
        AND player_id = $4
      `,
      [sanityAfter, tenantId, campaignId, playerId]
    );

    /* -------------------------------------------------------
       Pulse (only if SAN lost)
    ------------------------------------------------------- */
    if (loss > 0) {
      pulsePlayers.push({
        name: playerNameById[playerId] || "Unknown",
        sanity: sanityAfter,
      });
    }

    await query("COMMIT");

    /* -------------------------------------------------------
       Emit player viewer pulse (10s)
    ------------------------------------------------------- */
    if (pulsePlayers.length) {
      const expiresAt = new Date(Date.now() + 10_000);

      await query(
        `
        INSERT INTO player_sanity_pulse_playing (tenant_id, payload, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (tenant_id)
        DO UPDATE SET
          payload = excluded.payload,
          expires_at = excluded.expires_at,
          created_at = NOW()
        `,
        [
          tenantId,
          {
            title: "Sanity",
            players: pulsePlayers,
          },
          expiresAt,
        ]
      );
    }

    return Response.json({
      player_id: playerId,
      roll: d100,
      passed,
      sanity_loss: loss,
      sanity_before: currentSanity,
      sanity_after: sanityAfter,
      base_sanity: baseSanity,
      current_sanity: sanityAfter,
      percent: sanityAfter / baseSanity,
    });
  } catch (e) {
    await query("ROLLBACK");
    return Response.json({ error: e.message }, { status: 400 });
  }
}
