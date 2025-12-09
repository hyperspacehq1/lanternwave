import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/* -----------------------------------------------------------
   GET /api/sessions
------------------------------------------------------------ */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const campaignId = searchParams.get("campaign_id");

    if (id) {
      const result = await query(
        `SELECT * FROM sessions WHERE id=$1 LIMIT 1`,
        [id]
      );

      if (result.rows.length === 0)
        return NextResponse.json({ error: "Session not found" }, { status: 404 });

      return NextResponse.json(result.rows[0], { status: 200 });
    }

    if (campaignId) {
      const result = await query(
        `
        SELECT *
        FROM sessions
        WHERE campaign_id=$1
        ORDER BY created_at ASC
      `,
        [campaignId]
      );

      return NextResponse.json(result.rows, { status: 200 });
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
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const { campaign_id, description, geography, notes, history } =
      await req.json();

    if (!campaign_id)
      return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });

    if (!description)
      return NextResponse.json({ error: "description is required" }, { status: 400 });

    const result = await query(
      `
      INSERT INTO sessions
        (campaign_id, description, geography, notes, history, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5, NOW(), NOW())
      RETURNING *
    `,
      [campaign_id, description, geography || "", notes || "", history || ""]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
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
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { description, geography, notes, history } = await req.json();

    const result = await query(
      `
      UPDATE sessions
         SET description = COALESCE($2, description),
             geography   = COALESCE($3, geography),
             notes       = COALESCE($4, notes),
             history     = COALESCE($5, history),
             updated_at  = NOW()
       WHERE id=$1
       RETURNING *
    `,
      [id, description, geography, notes, history]
    );

    if (result.rows.length === 0)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    return NextResponse.json(result.rows[0], { status: 200 });
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
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const result = await query(
      `DELETE FROM sessions WHERE id=$1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err) {
    console.error("DELETE /sessions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
