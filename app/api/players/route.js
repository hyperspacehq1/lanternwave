import { query } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function validateRequiredString(val, max, field) {
  if (typeof val !== "string") throw new Error(`${field} must be a string`);
  const trimmed = val.trim();
  if (!trimmed) throw new Error(`${field} is required`);
  if (trimmed.length > max) throw new Error(`${field} max ${max} chars`);
  return trimmed;
}

function parseOptionalString(val) {
  if (val === null || val === undefined) return null;
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  return trimmed || null;
}

function parseOptionalInt(val, field) {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  if (!Number.isInteger(n)) throw new Error(`${field} must be an integer`);
  return n;
}

const PLAYER_SANITIZE = {
  name: 100,
  last_name: 500,
  character_name: 500,
  sanity: true,
  current_sanity: true,
  notes: 2000,
  phone: 50,
  email: 120,
  initiative_score: true,
  initiative_bonus: true,
};

/* ---------------- GET ---------------- */
export async function GET(req) {
  const ctx = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const campaignId = searchParams.get("campaign_id");

  if (id) {
    const { rows } = await query(
      `SELECT *
         FROM players
        WHERE tenant_id = $1
          AND id = $2
          AND deleted_at IS NULL
        LIMIT 1`,
      [ctx.tenantId, id]
    );

    return Response.json(
      rows[0] ? sanitizeRow(rows[0], PLAYER_SANITIZE) : null
    );
  }

  if (!campaignId) return Response.json([]);

  const { rows } = await query(
    `SELECT *
       FROM players
      WHERE tenant_id = $1
        AND campaign_id = $2
        AND deleted_at IS NULL
      ORDER BY created_at ASC`,
    [ctx.tenantId, campaignId]
  );

  return Response.json(sanitizeRows(rows, PLAYER_SANITIZE));
}

/* ---------------- POST ---------------- */
export async function POST(req) {
  const ctx = await getTenantContext(req);
  const body = await req.json();

  if (!body.campaign_id) {
    return Response.json({ error: "campaign_id is required" }, { status: 400 });
  }

  try {
    const id = uuid();
    const name = validateRequiredString(body.name, 100, "name");

    const last_name = parseOptionalString(body.last_name);
    const character_name = parseOptionalString(body.character_name);
    const notes = parseOptionalString(body.notes);
    const phone = parseOptionalString(body.phone);
    const email = parseOptionalString(body.email);

    const sanity = parseOptionalInt(body.sanity, "sanity") ?? 50;
    const current_sanity =
      parseOptionalInt(body.current_sanity, "current_sanity") ?? sanity;

    const initiative_score = parseOptionalInt(body.initiative_score, "initiative_score");
    const initiative_bonus = parseOptionalInt(body.initiative_bonus, "initiative_bonus");

    const { rows } = await query(
      `INSERT INTO players (
        id, tenant_id, campaign_id,
        name, last_name, character_name,
        sanity, current_sanity,
        notes, phone, email,
        initiative_score, initiative_bonus
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        id, ctx.tenantId, body.campaign_id,
        name, last_name, character_name,
        sanity, current_sanity,
        notes, phone, email,
        initiative_score, initiative_bonus,
      ]
    );

    return Response.json(
      sanitizeRow(rows[0], PLAYER_SANITIZE),
      { status: 201 }
    );
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* ---------------- PUT ---------------- */
export async function PUT(req) {
  const ctx = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  try {
    const sets = [];
    const values = [ctx.tenantId, id];
    let i = 3;

    if (hasOwn(body, "name")) {
      sets.push(`name = $${i++}`);
      values.push(validateRequiredString(body.name, 100, "name"));
    }

    for (const f of ["last_name","character_name","notes","phone","email"]) {
      if (!hasOwn(body, f)) continue;
      sets.push(`${f} = $${i++}`);
      values.push(parseOptionalString(body[f]));
    }

    for (const f of ["sanity","current_sanity","initiative_score","initiative_bonus"]) {
      if (!hasOwn(body, f)) continue;
      sets.push(`${f} = $${i++}`);
      values.push(parseOptionalInt(body[f], f));
    }

    if (!sets.length) {
      return Response.json({ error: "No valid fields provided" }, { status: 400 });
    }

    const { rows } = await query(
      `UPDATE players
          SET ${sets.join(", ")},
              updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2
          AND deleted_at IS NULL
        RETURNING *`,
      values
    );

    return Response.json(
      rows[0] ? sanitizeRow(rows[0], PLAYER_SANITIZE) : null
    );
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

/* ---------------- DELETE (SOFT) ---------------- */
export async function DELETE(req) {
  const ctx = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const { rows } = await query(
    `UPDATE players
        SET deleted_at = NOW(),
            updated_at = NOW()
      WHERE tenant_id = $1
        AND id = $2
        AND deleted_at IS NULL
      RETURNING *`,
    [ctx.tenantId, id]
  );

  return Response.json(
    rows[0] ? sanitizeRow(rows[0], PLAYER_SANITIZE) : null
  );
}
