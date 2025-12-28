import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";
import { fromDb } from "@/lib/campaignMapper";
import { cloneAdventureCodexToTenant } from "@/lib/ai/cloneAdventureCodexToTenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_RPG_GAMES = new Set([
  "Avatar Legends: The Roleplaying Game",
  "Call of Cthulhu",
  "Coriolis: The Great Dark",
  "Cyberpunk TTRPG (Red / variants)",
  "Cypher System / Daggerheart",
  "Dungeon Crawl Classics (DCC)",
  "Dungeons & Dragons 5th Edition",
  "Fabula Ultima",
  "Land of Eem",
  "Marvel Multiverse RPG",
  "Mörk Borg",
  "Mythic Bastionland",
  "Nimble 5e",
  "Pathfinder 2nd Edition",
  "Savage Worlds",
  "Shadowrun (6th/updated editions)",
  "Starfinder 2nd Edition",
  "StartPlaying",
  "Tales of the Valiant",
  "Vampire: The Masquerade 5th Edition",
]);

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function pick(body, camel, snake) {
  if (hasOwn(body, camel)) return body[camel];
  if (hasOwn(body, snake)) return body[snake];
  return undefined;
}

function normalizeDateOnly(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const s = String(value).trim();
  if (!s) return null;

  const datePart = s.includes("T") ? s.split("T")[0] : s;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;

  return datePart;
}

/* -------------------------------------------------
   GET /api/campaigns
-------------------------------------------------- */
export async function GET(req) {
  let tenantId;
  try {
    ({ tenantId } = await getTenantContext(req));
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
    [tenantId]
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

/* -------------------------------------------------
   POST /api/campaigns
-------------------------------------------------- */
export async function POST(req) {
  let tenantId;
  let userId;

  try {
    ({ tenantId, userId } = await getTenantContext(req));
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const name =
    typeof body?.name === "string" && body.name.trim()
      ? body.name.trim()
      : "New Campaign";

const campaignPackage =
  pick(body, "campaignPackage", "campaign_package") || "standard";

  // ✅ Validate Adventure Codex dynamically
  if (campaignPackage !== "standard") {
    const exists = await query(
      `
      SELECT 1
        FROM campaigns
       WHERE campaign_package = $1
         AND tenant_id IS NULL
         AND template_campaign_id IS NULL
         AND deleted_at IS NULL
       LIMIT 1
      `,
      [campaignPackage]
    );

    if (!exists.rows.length) {
      return Response.json(
        { error: "Invalid Adventure Codex" },
        { status: 400 }
      );
    }
  }

  const rpgGame = pick(body, "rpgGame", "rpg_game");
  if (
    rpgGame !== undefined &&
    rpgGame !== null &&
    rpgGame !== "" &&
    !ALLOWED_RPG_GAMES.has(rpgGame)
  ) {
    return Response.json({ error: "Invalid RPG game" }, { status: 400 });
  }

  const worldSetting = pick(body, "worldSetting", "world_setting") ?? null;
  const campaignDate = normalizeDateOnly(
    pick(body, "campaignDate", "campaign_date")
  );

  /* ---------------------------------------------
     STEP 1: CREATE CAMPAIGN
  --------------------------------------------- */
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
    VALUES ($1, $2, $3, $4, $5::date, $6, $7)
    RETURNING *
    `,
    [
      tenantId,
      name,
      body?.description ?? null,
      worldSetting,
      campaignDate,
      campaignPackage,
      rpgGame ?? null,
    ]
  );

  const campaign = rows[0];

  /* ---------------------------------------------
     STEP 2: CLONE ADVENTURE CODEX (ONE-TIME)
  --------------------------------------------- */
  if (campaignPackage !== "standard") {
    const template = await query(
      `
      SELECT id
        FROM campaigns
       WHERE campaign_package = $1
         AND tenant_id IS NULL
         AND template_campaign_id IS NULL
         AND deleted_at IS NULL
       LIMIT 1
      `,
      [campaignPackage]
    );

    await cloneAdventureCodexToTenant({
      templateCampaignId: template.rows[0].id,
      tenantCampaignId: campaign.id,
      tenantId,
      createdBy: userId,
    });
  }

  return Response.json(
    sanitizeRow(fromDb(campaign), {
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

/* -------------------------------------------------
   PUT /api/campaigns?id=
-------------------------------------------------- */
export async function PUT(req) {
  let tenantId;
  try {
    ({ tenantId } = await getTenantContext(req));
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const body = await req.json();

  if (hasOwn(body, "name") && !String(body.name).trim()) {
    return Response.json(
      { error: "Campaign name cannot be blank" },
      { status: 400 }
    );
  }

  // ❌ campaign_package is immutable after creation
  if (hasOwn(body, "campaignPackage") || hasOwn(body, "campaign_package")) {
    return Response.json(
      { error: "campaignPackage cannot be changed after creation" },
      { status: 400 }
    );
  }

  const rpgGame = pick(body, "rpgGame", "rpg_game");
  if (
    rpgGame !== undefined &&
    rpgGame !== null &&
    rpgGame !== "" &&
    !ALLOWED_RPG_GAMES.has(rpgGame)
  ) {
    return Response.json({ error: "Invalid RPG game" }, { status: 400 });
  }

  const sets = [];
  const values = [tenantId, id];
  let i = 3;

  if (hasOwn(body, "name")) {
    sets.push(`name = $${i++}`);
    values.push(String(body.name).trim());
  }

  if (hasOwn(body, "description")) {
    sets.push(`description = $${i++}`);
    values.push(body.description ?? null);
  }

  const worldSetting = pick(body, "worldSetting", "world_setting");
  if (worldSetting !== undefined) {
    sets.push(`world_setting = $${i++}`);
    values.push(worldSetting ?? null);
  }

  const dateRaw = pick(body, "campaignDate", "campaign_date");
  if (dateRaw !== undefined) {
    sets.push(`campaign_date = $${i++}::date`);
    values.push(normalizeDateOnly(dateRaw));
  }

  if (rpgGame !== undefined) {
    sets.push(`rpg_game = $${i++}`);
    values.push(rpgGame ?? null);
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

  if (!rows.length) {
    return Response.json({ error: "Campaign not found" }, { status: 404 });
  }

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

/* -------------------------------------------------
   DELETE /api/campaigns?id=
-------------------------------------------------- */
export async function DELETE(req) {
  let tenantId;
  try {
    ({ tenantId } = await getTenantContext(req));
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

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
    [tenantId, id]
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
