import { query } from "@/lib/db";

/* -------------------------------------------------
   PUT /api/player-characters/:id
-------------------------------------------------- */
export async function PUT(req, { params }) {
  const id = params.id;
  const body = await req.json();

  const first_name = body.firstName ?? body.first_name ?? null;
  const last_name  = body.lastName  ?? body.last_name  ?? null;
  const phone = body.phone ?? null;
  const email = body.email ?? null;
  const notes = body.notes ?? null;

  if (!first_name || !last_name) {
    return Response.json(
      { error: "firstName and lastName are required" },
      { status: 400 }
    );
  }

  const result = await query(
    `
    UPDATE player_characters
       SET first_name = $1,
           last_name  = $2,
           phone      = $3,
           email      = $4,
           notes      = $5,
           updated_at = NOW()
     WHERE id = $6
       AND deleted_at IS NULL
     RETURNING *
    `,
    [first_name, last_name, phone, email, notes, id]
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
