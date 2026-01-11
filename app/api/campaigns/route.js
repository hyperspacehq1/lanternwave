import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { fromDb } from "@/lib/campaignMapper";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

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
  "Vampire: The Masquerade 5th Edition"
  "XYZ-Custom Campaign Codex"
]);

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function pick(body, camel, snake) {
  if (hasOwn(body, camel)) return body[camel];
  if (hasOwn(body, snake)) return body[snake];
  return undefined;
}

function normalizeDateOnlyStrict(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const s = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error("Invalid date format");
  }
  return s;
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
----------------------------- */
export async function POST(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const name =
    typeof body?.name === "string" && body.name.trim()
      ? body.name.trim()
      : "New Campaign";

  const campaignPackage =
    body.campaignPackage || body.campaign_package || "standard";

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
      return Response.json({ error: "Invalid Adventure Codex" }, { status: 400 });
    }
  }

  const rpgGame = pick(body, "rpgGame", "rpg_game");
  if (rpgGame && !ALLOWED_RPG_GAMES.has(rpgGame)) {
    return Response.json({ error: "Invalid RPG game" }, { status: 400 });
  }

  let campaignDate;
  try {
    campaignDate = normalizeDateOnlyStrict(
      pick(body, "campaignDate", "campaign_date")
    );
  } catch {
    return Response.json(
      { error: "Invalid campaignDate format (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

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
      campaignDate,
      campaignPackage,
      rpgGame ?? null,
    ]
  );

  return Response.json(
    sanitizeRow(fromDb(rows[0]), {
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
   PUT /api/campaigns
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
    })
  );
}
