import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/player-characters
------------------------------------------------------------ */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const campaignId = searchParams.get("campaign_id");

  if (id) {
    const { rows } = await query(
      `
      SELECT
        id,
        campaign_id,
        first_name AS "firstName",
        last_name  AS "lastName",
        character_name AS "characterName",
        phone,
        email,
        notes,
        created_at,
        updated_at
      FROM player_characters
      WHERE tenant_id = $1
        AND id = $2
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [tenantId, id]
    );

    return Response.json(
      rows[0]
        ? sanitizeRow(rows[0], {
            firstName: 60,
            lastName: 60,
            characterName: 100,
            phone: 40,
            email: 254,
            notes: 10000,
          })
        : null
    );
  }

let campaignIdFinal = campaignId;

if (!campaignIdFinal && searchParams.get("session_id")) {
  const { rows } = await query(
    `SELECT campaign_id FROM sessions WHERE id = $1`,
    [searchParams.get("session_id")]
  );
  campaignIdFinal = rows[0]?.campaign_id;
}

if (!campaignIdFinal) {
  return Response.json([]);
}

  const { rows } = await query(
    `
    SELECT
      id,
      campaign_id,
      first_name AS "firstName",
      last_name  AS "lastName",
      character_name AS "characterName",
      phone,
      email,
      notes,
      created_at,
      updated_at
    FROM player_characters
    WHERE tenant_id = $1
      AND campaign_id = $2
      AND deleted_at IS NULL
    ORDER BY created_at ASC
    `,
    [tenantId, campaignId]
  );

  return Response.json(
    sanitizeRows(rows, {
      firstName: 60,
      lastName: 60,
      characterName: 100,
      phone: 40,
      email: 254,
      notes: 10000,
    })
  );
}

/* -----------------------------------------------------------
   POST /api/player-characters
------------------------------------------------------------ */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  const campaignId = body.campaign_id ?? body.campaignId ?? null;
  const firstName = body.firstName ?? body.first_name ?? null;
  const lastName = body.lastName ?? body.last_name ?? null;
  const characterName = body.characterName ?? body.character_name ?? null;

  if (!campaignId) {
    return Response.json({ error: "campaign_id is required" }, { status: 400 });
  }

  if (!firstName?.trim() || !lastName?.trim()) {
    return Response.json(
      { error: "firstName and lastName are required" },
      { status: 400 }
    );
  }

  const { rows } = await query(
    `
    INSERT INTO player_characters (
      id,
      tenant_id,
      campaign_id,
      first_name,
      last_name,
      character_name,
      phone,
      email,
      notes
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
    `,
    [
      uuid(),
      tenantId,
      campaignId,
      firstName.trim(),
      lastName.trim(),
      characterName ?? null,
      body.phone ?? null,
      body.email ?? null,
      body.notes ?? null,
    ]
  );

  return Response.json(
    sanitizeRow(rows[0], {
      firstName: 60,
      lastName: 60,
      characterName: 100,
      phone: 40,
      email: 254,
      notes: 10000,
    }),
    { status: 201 }
  );
}

/* -----------------------------------------------------------
   PUT /api/player-characters?id=
------------------------------------------------------------ */
export async function PUT(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  if (
    ("firstName" in body && !body.firstName?.trim()) ||
    ("lastName" in body && !body.lastName?.trim())
  ) {
    return Response.json(
      { error: "firstName and lastName cannot be blank" },
      { status: 400 }
    );
  }

  const sets = [];
  const values = [tenantId, id];
  let i = 3;

  if (body.firstName !== undefined || body.first_name !== undefined) {
    sets.push(`first_name = $${i++}`);
    values.push((body.firstName ?? body.first_name).trim());
  }

  if (body.lastName !== undefined || body.last_name !== undefined) {
    sets.push(`last_name = $${i++}`);
    values.push((body.lastName ?? body.last_name).trim());
  }

  if (body.characterName !== undefined || body.character_name !== undefined) {
    sets.push(`character_name = $${i++}`);
    values.push(body.characterName ?? body.character_name);
  }

  if (body.phone !== undefined) {
    sets.push(`phone = $${i++}`);
    values.push(body.phone);
  }

  if (body.email !== undefined) {
    sets.push(`email = $${i++}`);
    values.push(body.email);
  }

  if (body.notes !== undefined) {
    sets.push(`notes = $${i++}`);
    values.push(body.notes);
  }

  if (!sets.length) {
    return Response.json(
      { error: "No valid fields provided" },
      { status: 400 }
    );
  }

  const { rows } = await query(
    `
    UPDATE player_characters
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
    rows[0]
      ? sanitizeRow(rows[0], {
          firstName: 60,
          lastName: 60,
          characterName: 100,
          phone: 40,
          email: 254,
          notes: 10000,
        })
      : null
  );
}

/* -----------------------------------------------------------
   DELETE /api/player-characters?id=
------------------------------------------------------------ */
export async function DELETE(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE player_characters
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
      ? sanitizeRow(rows[0], {
          firstName: 60,
          lastName: 60,
          characterName: 100,
          phone: 40,
          email: 254,
          notes: 10000,
        })
      : null
  );
}
