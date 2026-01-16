import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   Dice helpers
------------------------------------------------------------ */
function rollD100() {
  return Math.floor(Math.random() * 100) + 1;
}

function rollLoss(type) {
  switch (type) {
    case "0/1":
      return Math.random() < 0.5 ? 0 : 1;
    case "1d6":
      return Math.floor(Math.random() * 6) + 1;
    case "1d10":
      return Math.floor(Math.random() * 10) + 1;
    case "1d20":
      return Math.floor(Math.random() * 20) + 1;
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

  const playerId = body.player_id;
  const campaignId = body.campaign_id;
  const rollType = body.roll_type;

  if (!playerId || !campaignId || !rollType) {
    return Response.json(
      { error: "player_id, campaign_id, and roll_type are required" },
      { status: 400 }
    );
  }

  /* ---------------------------------------------------------
     Transaction
  --------------------------------------------------------- */
  try {
    await query("BEGIN");

    /* 1️⃣ Ensure sanity row exists */
    const sanityRes = await query(
      `
      SELECT ps.*, p.sanity AS base
        FROM player_sanity ps
        JOIN players p ON p.id = ps.player_id
       WHERE ps.tenant_id = $1
         AND ps.campaign_id = $2
         AND ps.player_id = $3
       LIMIT 1
      `,
      [tenantId, campaignId, playerId]
    );

    let baseSanity;
    let currentSanity;

    if (!sanityRes.rows.length) {
      const playerRes = await query(
        `
        SELECT sanity
          FROM players
         WHERE id = $1
           AND tenant_id = $2
         LIMIT 1
        `,
        [playerId, tenantId]
      );

      baseSanity = playerRes.rows[0]?.sanity;
      if (!Number.isInteger(baseSanity)) {
        throw new Error("Player base sanity not set");
      }

      currentSanity = baseSanity;

      await query(
        `
        INSERT INTO player_sanity (
          id, tenant_id, campaign_id, player_id, base_sanity, current_sanity
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [uuid(), tenantId, campaignId, playerId, baseSanity, currentSanity]
      );
    } else {
      baseSanity = sanityRes.rows[0].base_sanity;
      currentSanity = sanityRes.rows[0].current_sanity;
    }

    /* 2️⃣ Roll SAN check */
    const roll = rollD100();
    const passed = roll <= currentSanity;

    const loss = passed ? 0 : rollLoss(rollType);
    const sanityAfter = Math.max(0, currentSanity - loss);

    /* 3️⃣ Insert event */
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

    /* 4️⃣ Update current sanity */
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

    await query("COMMIT");

    return Response.json({
      player_id: playerId,
      roll,
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
