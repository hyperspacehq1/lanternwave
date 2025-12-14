import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { v4 as uuid } from "uuid";

/* -----------------------------------------------------------
   GET /api/events
   Optional: ?id=
------------------------------------------------------------ */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      const row = await query(
        `SELECT *
         FROM events
         WHERE id = $1`,
        [id]
      );

      return NextResponse.json(row.rows[0] || null);
    }

    const list = await query(
      `SELECT *
       FROM events
       ORDER BY created_at ASC`
    );

    return NextResponse.json(list.rows);
  } catch (err) {
    console.error("GET /events error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   POST /api/events
------------------------------------------------------------ */
export async function POST(req) {
  const headers = Object.fromEntries(req.headers.entries());
  const auth = requireAdmin(headers);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const id = uuid();

    const row = await query(
      `
      INSERT INTO events (
        id,
        name,
        description,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
      `,
      [
        id,
        body.name,
        body.description,
      ]
    );

    return NextResponse.json(row.rows[0]);
  } catch (err) {
    console.error("POST /events error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   PUT /api/events?id=
------------------------------------------------------------ */
export async function PUT(req) {
  const headers = Object.fromEntries(req.headers.entries());
  const auth = requireAdmin(headers);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    const body = await req.json();

    const row = await query(
      `
      UPDATE events
         SET name        = $2,
             description = $3,
             updated_at  = NOW()
       WHERE id = $1
       RETURNING *
      `,
      [
        id,
        body.name,
        body.description,
      ]
    );

    return NextResponse.json(row.rows[0]);
  } catch (err) {
    console.error("PUT /events error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/events?id=
------------------------------------------------------------ */
export async function DELETE(req) {
  const headers = Object.fromEntries(req.headers.entries());
  const auth = requireAdmin(headers);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    await query(
      `DELETE FROM events WHERE id = $1`,
      [id]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /events error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
