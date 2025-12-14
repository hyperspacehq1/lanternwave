import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { v4 as uuid } from "uuid";

/* -----------------------------------------------------------
   GET /api/logs
   Optional: ?id=
------------------------------------------------------------ */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      const row = await query(
        `SELECT *
         FROM logs
         WHERE id = $1`,
        [id]
      );

      return NextResponse.json(row.rows[0] || null);
    }

    const list = await query(
      `SELECT *
       FROM logs
       ORDER BY created_at DESC`
    );

    return NextResponse.json(list.rows);
  } catch (err) {
    console.error("GET /logs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   POST /api/logs
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
      INSERT INTO logs (
        id,
        level,
        message,
        meta,
        created_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
      `,
      [
        id,
        body.level,
        body.message,
        body.meta || null,
      ]
    );

    return NextResponse.json(row.rows[0]);
  } catch (err) {
    console.error("POST /logs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/logs?id=
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
      `DELETE FROM logs WHERE id = $1`,
      [id]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /logs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
