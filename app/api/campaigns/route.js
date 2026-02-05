import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { fromDb } from "@/lib/campaignMapper";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { applyTemplate } from "@/lib/campaignImporter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_RPG_GAMES = new Set([
  "ALIEN: The Roleplaying Game",
  "Avatar Legends: The Roleplaying Game",
  "Black Powder & Brimstone",
  "Blade Runner: The Roleplaying Game",
  "Call of Cthulhu",
  "Coriolis: The Great Dark",
  "Cyberpunk TTRPG",
  "Cypher System / Daggerheart",
  "Delta Green",
  "Dragonbane",
  "Dungeon Crawl Classics",
  "Dungeons & Dragons 5th Edition",
  "Fabula Ultima",
  "Forbidden Lands",
  "Into the Odd",
  "Invincible: The Roleplaying Game",
  "Land of Eem",
  "Marvel Multiverse RPG",
  "Mörk Borg",
  "Mutant: Year Zero",
  "Mythic Bastionland",
  "Nimble 5e",
  "Pathfinder 2nd Edition",
  "Pirate Borg",
  "Ruins of Symbaroum",
  "Savage Worlds",
  "Shadowrun (6th/updated editions)",
  "Starfinder 2nd Edition",
  "StartPlaying",
  "Symbaroum",
  "Tales from the Loop",
  "Tales of the Valiant",
  "The Electric State Roleplaying Game",
  "The One Ring Roleplaying Game",
  "Vaesen",
  "Vampire: The Masquerade 5th Edition",
  "XYZ-Custom Campaign Codex",
]);

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function pick(body, camel, snake) {
  if (hasOwn(body, camel)) return body[camel];
  if (hasOwn(body, snake)) return body[snake];
  return undefined;
}

/* -----------------------------
   GET /api/campaigns
----------------------------- */
export async function GET(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rows } = await query(
    `
    SELECT *
      FROM campaigns
     WHERE tenant_id = $1
       AND deleted_at IS NULL
     ORDER BY created_at DESC
    `,
    [ctx.tenantId]
  );

  return Response.json(
    sanitizeRows(rows.map(fromDb), {
      name: 120,
      description: 10000,
      worldSetting: 10000,
      campaignDate: 50,
      campaignPackage: 50,
      rpgGame: 120,
    })
  );
}

/* -----------------------------
   POST /api/campaigns
   Now with template import support
----------------------------- */
export async function POST(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Plan enforcement
  const { getCurrentPlan, getPlanLimits } = await import("@/lib/plans");
  const plan = getCurrentPlan(ctx);
  const { maxCampaigns } = getPlanLimits(plan);

  const countResult = await query(
    `
    SELECT COUNT(*)::int AS count
      FROM campaigns
     WHERE tenant_id = $1
       AND deleted_at IS NULL
    `,
    [ctx.tenantId]
  );

  const currentCount = countResult.rows[0]?.count ?? 0;

  if (currentCount >= maxCampaigns) {
    return Response.json(
      {
        ok: false,
        error: "campaign_limit_exceeded",
        plan,
        usedCampaigns: currentCount,
        limitCampaigns: maxCampaigns,
        attemptedCampaigns: currentCount + 1,
      },
      { status: 403 }
    );
  }

  const body = await req.json();

  const name =
    typeof body?.name === "string" && body.name.trim()
      ? body.name.trim()
      : "New Campaign";

  const campaignPackage =
    body.campaignPackage || body.campaign_package || "standard";

  const rpgGame = pick(body, "rpgGame", "rpg_game");
  if (rpgGame && !ALLOWED_RPG_GAMES.has(rpgGame)) {
    return Response.json({ error: "Invalid RPG game" }, { status: 400 });
  }

  // Create the campaign first
  const { rows } = await query(
    `
    INSERT INTO campaigns (
      tenant_id,
      name,
      description,
      world_setting,
      campaign_date,
      campaign_package,
      rpg_game
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
    `,
    [
      ctx.tenantId,
      name,
      body.description ?? null,
      pick(body, "worldSetting", "world_setting"),
      pick(body, "campaignDate", "campaign_date"),
      campaignPackage,
      rpgGame ?? null,
    ]
  );

  const newCampaign = rows[0];

  // If a template is specified (and it's not "standard"), apply it
  if (campaignPackage && campaignPackage !== "standard") {
    try {
      const templateResult = await applyTemplate(
        ctx.tenantId, 
        newCampaign.id, 
        campaignPackage
      );
      console.log("Template applied:", templateResult);
    } catch (error) {
      console.error("Failed to apply template:", error);
      // Don't fail campaign creation if template fails
      // Campaign exists, just without template data
    }
  }

  return Response.json(
    sanitizeRow(fromDb(newCampaign), {
      name: 120,
      description: 10000,
      worldSetting: 10000,
      campaignDate: 50,
      campaignPackage: 50,
      rpgGame: 120,
    }),
    { status: 201 }
  );
}

/* -----------------------------
   PUT /api/campaigns?id=
----------------------------- */
export async function PUT(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const body = await req.json();

  const sets = [];
  const values = [ctx.tenantId, id];
  let i = 3;

  if (hasOwn(body, "name")) {
    sets.push(`name = $${i++}`);
    values.push(String(body.name).trim());
  }

  if (hasOwn(body, "description")) {
    sets.push(`description = $${i++}`);
    values.push(body.description ?? null);
  }

  if (hasOwn(body, "worldSetting") || hasOwn(body, "world_setting")) {
    sets.push(`world_setting = $${i++}`);
    values.push(pick(body, "worldSetting", "world_setting"));
  }

  if (hasOwn(body, "campaignDate") || hasOwn(body, "campaign_date")) {
    sets.push(`campaign_date = $${i++}`);
    values.push(pick(body, "campaignDate", "campaign_date"));
  }

  if (hasOwn(body, "campaignPackage") || hasOwn(body, "campaign_package")) {
    sets.push(`campaign_package = $${i++}`);
    values.push(pick(body, "campaignPackage", "campaign_package"));
  }

  if (hasOwn(body, "rpgGame") || hasOwn(body, "rpg_game")) {
    sets.push(`rpg_game = $${i++}`);
    values.push(pick(body, "rpgGame", "rpg_game"));
  }

  if (!sets.length) {
    return Response.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE campaigns
       SET ${sets.join(", ")},
           updated_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    values
  );

  return Response.json(
    sanitizeRow(fromDb(rows[0]), {
      name: 120,
      description: 10000,
      worldSetting: 10000,
      campaignDate: 50,
      campaignPackage: 50,
      rpgGame: 120,
    })
  );
}

/* -----------------------------
   DELETE /api/campaigns?id=
----------------------------- */
export async function DELETE(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE campaigns
       SET deleted_at = NOW(),
           updated_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [ctx.tenantId, id]
  );

  return Response.json(
    rows[0]
      ? sanitizeRow(fromDb(rows[0]), {
          name: 120,
          description: 10000,
          worldSetting: 10000,
          campaignDate: 50,
          campaignPackage: 50,
          rpgGame: 120,
        })
      : null
  );
}

