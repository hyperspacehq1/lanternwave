import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/* -----------------------------------------------------------
   GET /api/items
------------------------------------------------------------ */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const eventId = searchParams.get("event_id");

    // Single item
    if (id) {
      const itemRes = await query(
        `SELECT * FROM items WHERE id=$1 LIMIT 1`,
        [id]
      );

      if (itemRes.rows.length === 0)
        return NextResponse.json({ error: "Item not found" }, { status: 404 });

      const events = (
        await query(
          `
          SELECT e.*
          FROM event_items ei
          JOIN events e ON e.id = ei.event_id
          WHERE ei.item_id=$1
          ORDER BY e.created_at ASC
        `,
          [id]
        )
      ).rows;

      return NextResponse.json(
        { ...itemRes.rows[0], events },
        { status: 200 }
      );
    }

    // Items for event
    if (eventId) {
      const out = await query(
        `
        SELECT items.*
        FROM event_items ei
        JOIN items ON items.id = ei.item_id
        WHERE ei.event_id=$1
        ORDER BY items.description ASC
      `,
        [eventId]
      );
      return NextResponse.json(out.rows, { status: 200 });
    }

    // All items
    const out = await query(`SELECT * FROM items ORDER BY description ASC`);
    return NextResponse.json(out.rows, { status: 200 });
  } catch (err) {
    console.error("GET /items error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   POST /api/items
------------------------------------------------------------ */
export async function POST(req) {
  try {
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const { description, notes } = await req.json();

    if (!description)
      return NextResponse.json({ error: "description is required" }, { status: 400 });

    const result = await query(
      `
      INSERT INTO items
        (description, notes, created_at, updated_at)
      VALUES ($1,$2, NOW(), NOW())
      RETURNING *
    `,
      [description, notes || ""]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /items error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   PUT /api/items?id=
------------------------------------------------------------ */
export async function PUT(req) {
  try {
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { description, notes } = await req.json();

    const result = await query(
      `
      UPDATE items
         SET description = COALESCE($2, description),
             notes       = COALESCE($3, notes),
             updated_at  = NOW()
       WHERE id=$1
       RETURNING *
    `,
      [id, description, notes]
    );

    if (result.rows.length === 0)
      return NextResponse.json({ error: "Item not found" }, { status: 404 });

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (err) {
    console.error("PUT /items error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/items?id=
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
      `DELETE FROM items WHERE id=$1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0)
      return NextResponse.json({ error: "Item not found" }, { status: 404 });

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err) {
    console.error("DELETE /items error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
