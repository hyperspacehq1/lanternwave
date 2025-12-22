import { query } from "@/lib/db";
import { v4 as uuid } from "uuid";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/player-characters
------------------------------------------------------------ */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const campaignId = searchParams.get("campaign_id");

  if (id) {
    const result = await query(
      `
      SELECT *
      FROM player_characters
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );
    return Response.json(result.rows[0] || null);
  }

  if (!campaignId) {
    return Response.json([]);
  }

  const list = await query(
    `
    SELECT *
    FROM player_characters
    WHERE campaign_id = $1
    ORDER BY created_at ASC
    `,
    [campaignId]
  );

  return Response.json(list.rows);
}

/* -----------------------------------------------------------
   POST /api/player-characters
------------------------------------------------------------ */
export async function POST(req) {
  const body = await req.json();

  const firstName =
    body.firstName ??
    body.first_name ??
    null;

  const lastName =
    body.lastName ??
    body.last_name ??
    null;

  if (!body.campaign_id) {
    return Response.json(
      { error: "campaign_id is required" },
      { status: 400 }
    );
  }

  if (!firstName || !lastName) {
    return Response.json(
      { error: "firstName and lastName are required" },
      { status: 400 }
    );
  }

  const result = await query(
    `
    INSERT INTO player_characters (
      id,
      campaign_id,
      first_name,
      last_name,
      phone,
      email,
      notes
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
    `,
    [
      uuid(),
      body.campaign_id,
      firstName.trim(),
      lastName.trim(),
      body.phone ?? null,
      body.email ?? null,
      body.notes ?? null,
    ]
  );

  return Response.json(result.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   PUT /api/player-characters?id=
------------------------------------------------------------ */
export async function PUT(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const result = await query(
    `
    UPDATE player_characters
       SET first_name = COALESCE($2, first_name),
           last_name  = COALESCE($3, last_name),
           phone      = COALESCE($4, phone),
           email      = COALESCE($5, email),
           notes      = COALESCE($6, notes),
           updated_at = NOW()
     WHERE id = $1
     RETURNING *
    `,
    [
      id,
      body.firstName ?? body.first_name,
      body.lastName ?? body.last_name,
      body.phone,
      body.email,
      body.notes,
    ]
  );

  return Response.json(result.rows[0] || null);
}
