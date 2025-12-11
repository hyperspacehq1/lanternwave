// app/api/sessions/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/* -----------------------------------------------------------
   GET /api/sessions?id= OR ?campaign_id=
------------------------------------------------------------ */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const campaignId = searchParams.get("campaign_id");

    if (id) {
      const rows = await query`
        SELECT *
        FROM sessions
        WHERE id = ${id}
        LIMIT 1
      `;

      if (!rows.length)
        return NextResponse.json({ error: "Session not found" }, { status: 404 });

      return NextResponse.json(rows[0], { status: 200 });
    }

    if (campaignId) {
      const rows = await query`
        SELECT *
        FROM sessions
        WHERE campaign_id = ${campaignId}
        ORDER BY created_at ASC
      `;

      return NextResponse.json(rows, { status: 200 });
    }

    return NextResponse.json(
      { error: "Either id or campaign_id is required" },
      { status: 400 }
    );
  } catch (err) {
    console.error("GET /sessions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   POST /api/sessions
------------------------------------------------------------ */
export async function POST(req) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();

    if (!body.campaign_id) {
      return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
    }

    const rows = await query`
      INSERT INTO sessions (
        campaign_id,
        description,
        geography,
        notes,
        history,
        created_at,
        updated_at
      )
      VALUES (
        ${body.campaign_id},
        ${body.description ?? ""},
        ${body.geography ?? ""},
        ${body.notes ?? ""},
        ${body.history ?? ""},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /sessions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   PUT /api/sessions?id=
------------------------------------------------------------ */
export async function PUT(req) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const body = await req.json();

    const rows = await query`
      UPDATE sessions
      SET
        description = ${body.description},
        geography = ${body.geography},
        notes = ${body.notes},
        history = ${body.history},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (!rows.length)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    return NextResponse.json(rows[0], { status: 200 });
  } catch (err) {
    console.error("PUT /sessions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/sessions?id=
------------------------------------------------------------ */
export async function DELETE(req) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const rows = await query`
      DELETE FROM sessions
      WHERE id = ${id}
      RETURNING id
    `;

    if (!rows.length)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err) {
    console.error("DELETE /sessions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

