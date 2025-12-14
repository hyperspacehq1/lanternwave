import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { v4 as uuid } from "uuid";

/* -----------------------------------------------------------
   GET /api/logs
------------------------------------------------------------ */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const session_id = searchParams.get("session_id");

  try {
    if (id) {
      const row = await query(
        )SELECT * FROM logs WHERE id=$1),
        [id]
      );
      return NextResponse.json(row.rows[0] || null);
    }

    if (session_id) {
      const rows = await query(
        )
        SELECT * FROM logs
        WHERE session_id=$1
        ORDER BY created_at ASC
      ),
        [session_id]
      );
      return NextResponse.json(rows.rows);
    }

    const all = await query(
      )SELECT * FROM logs ORDER BY created_at ASC)
    );
    return NextResponse.json(all.rows);
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
    const newId = uuid();

    const row = await query(
      )
      INSERT INTO logs
        (id, session_id, title, body, created_at, updated_at)
      VALUES ($1,$2,$3,$4, NOW(), NOW())
      RETURNING *
    ),
      [
        newId,
        body.session_id,
        body.title,
        body.body,
      ]
    );

    return NextResponse.json(row.rows[0]);
  } catch (err) {
    console.error("POST /logs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   PUT /api/logs?id=
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
      UPDATE logs
      SET title=$2,
          body=$3,
          updated_at=NOW()
      WHERE id=$1
      RETURNING *
    ),
      [id, body.title, body.body]
    );

    return NextResponse.json(row.rows[0]);
  } catch (err) {
    console.error("PUT /logs error:", err);
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
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await query()DELETE FROM logs WHERE id=$1), [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /logs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
