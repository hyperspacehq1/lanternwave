import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { v4 as uuid } from "uuid";

/* -----------------------------------------------------------
   GET /api/quests
------------------------------------------------------------ */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const campaign_id = searchParams.get("campaign_id");

  try {
    if (id) {
      const result = await query(
        `SELECT * FROM quests WHERE id=$1`,
        [id]
      );
      return NextResponse.json(result.rows[0] || null);
    }

    if (campaign_id) {
      const result = await query(
        `
        SELECT * FROM quests
        WHERE campaign_id=$1
        ORDER BY created_at ASC
      `,
        [campaign_id]
      );
      return NextResponse.json(result.rows);
    }

    const all = await query(
      `SELECT * FROM quests ORDER BY created_at ASC`
    );
    return NextResponse.json(all.rows);
  } catch (err) {
    console.error("GET /quests error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   POST /api/quests
------------------------------------------------------------ */
export async function POST(req) {
  const headers = Object.fromEntries(req.headers.entries());
  const auth = requireAdmin(headers);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const newId = uuid();

    const row = await query(
      `
      INSERT INTO quests
        (id, campaign_id, description, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4, NOW(), NOW())
      RETURNING *
    `,
      [
        newId,
        body.campaign_id,
        body.description,
        body.status || "open",
      ]
    );

    return NextResponse.json(row.rows[0]);
  } catch (err) {
    console.error("POST /quests error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   PUT /api/quests?id=
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
      `
      UPDATE quests
      SET description=$2,
          status=$3,
          updated_at=NOW()
      WHERE id=$1
      RETURNING *
    `,
      [id, body.description, body.status]
    );

    return NextResponse.json(row.rows[0]);
  } catch (err) {
    console.error("PUT /quests error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/quests?id=
------------------------------------------------------------ */
export async function DELETE(req) {
  const headers = Object.fromEntries(req.headers.entries());
  const auth = requireAdmin(headers);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await query(`DELETE FROM quests WHERE id=$1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /quests error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
