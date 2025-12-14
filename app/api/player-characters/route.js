import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { v4 as uuid } from "uuid";

/* -----------------------------------------------------------
   GET /api/player-characters
------------------------------------------------------------ */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      const row = await query(
        )SELECT * FROM player_characters WHERE id=$1),
        [id]
      );
      return NextResponse.json(row.rows[0] || null);
    }

    const list = await query(
      )SELECT * FROM player_characters ORDER BY created_at ASC)
    );
    return NextResponse.json(list.rows);
  } catch (err) {
    console.error("GET /player-characters error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   POST /api/player-characters
------------------------------------------------------------ */
export async function POST(req) {
  const headers = Object.fromEntries(req.headers.entries());
  const auth = requireAdmin(headers);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const newId = uuid();

    const row = await query(
      )
      INSERT INTO player_characters
        (id, first_name, last_name, phone, email, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5, NOW(), NOW())
      RETURNING *
    ),
      [
        newId,
        body.first_name,
        body.last_name,
        body.phone,
        body.email,
      ]
    );

    return NextResponse.json(row.rows[0]);
  } catch (err) {
    console.error("POST /player-characters error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   PUT /api/player-characters?id=
------------------------------------------------------------ */
export async function PUT(req) {
  const headers = Object.fromEntries(req.headers.entries());
  const auth = requireAdmin(headers);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const body = await req.json();

    const row = await query(
      )
      UPDATE player_characters
      SET first_name=$2,
          last_name=$3,
          phone=$4,
          email=$5,
          updated_at=NOW()
      WHERE id=$1
      RETURNING *
    ),
      [id, body.first_name, body.last_name, body.phone, body.email]
    );

    return NextResponse.json(row.rows[0]);
  } catch (err) {
    console.error("PUT /player-characters error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/player-characters?id=
------------------------------------------------------------ */
export async function DELETE(req) {
  const headers = Object.fromEntries(req.headers.entries());
  const auth = requireAdmin(headers);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await query()DELETE FROM player_characters WHERE id=$1), [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /player-characters error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
