import { query } from "@/lib/db";
import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";

/* -------------------------------------------------
   PUT /api/player-characters/:id
-------------------------------------------------- */
export async function PUT(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const firstName =
    body.firstName ??
    body.first_name ??
    null;

  const lastName =
    body.lastName ??
    body.last_name ??
    null;

  // 🚫 HARD BLOCK empty names
  if (!firstName || !lastName) {
    return Response.json(
      { error: "firstName and lastName are required" },
      { status: 400 }
    );
  }

  const result = await query(
    `
    UPDATE player_characters
       SET first_name = $2,
           last_name  = $3,
           phone      = COALESCE($4, phone),
           email      = COALESCE($5, email),
           notes      = COALESCE($6, notes),
           updated_at = NOW()
     WHERE id = $1
       AND deleted_at IS NULL
     RETURNING
       id,
       campaign_id,
       first_name AS "firstName",
       last_name  AS "lastName",
       phone,
       email,
       notes,
       created_at,
       updated_at
    `,
    [
      id,
      firstName.trim(),
      lastName.trim(),
      body.phone,
      body.email,
      body.notes,
    ]
  );

  if (!result.rows.length) {
    return Response.json(
      { error: "player_character not found" },
      { status: 404 }
    );
  }

  return Response.json(result.rows[0]);
}

/* -------------------------------------------------
   DELETE /api/player-characters/:id
-------------------------------------------------- */
export async function DELETE(req, { params }) {
  const id = params.id;

  await query(
    `
    UPDATE player_characters
       SET deleted_at = NOW()
     WHERE id = $1
    `,
    [id]
  );

  return Response.json({ ok: true });
}
