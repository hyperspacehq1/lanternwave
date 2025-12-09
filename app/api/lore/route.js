import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/* -----------------------------------------------------------
   GET /api/lore
------------------------------------------------------------ */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const encounterId = searchParams.get("encounter_id");

    // Single lore
    if (id) {
      const loreRes = await query(
        `SELECT * FROM lore WHERE id=$1 LIMIT 1`,
        [id]
      );

      if (loreRes.rows.length === 0)
        return NextResponse.json({ error: "Lore not found" }, { status: 404 });

      const encounters = (
        await query(
          `
          SELECT e.*
          FROM encounter_lore el
          JOIN encounters e ON e.id = el.encounter_id
          WHERE el.lore_id=$1
          ORDER BY e.created_at ASC
        `,
          [id]
        )
      ).rows;

      return NextResponse.json(
        { ...loreRes.rows[0], encounters },
        { status: 200 }
      );
    }

    // Lore for encounter
    if (encounterId) {
      const out = await query(
        `
        SELECT l.*
        FROM encounter_lore el
        JOIN lore l ON l.id = el.lore_id
        WHERE el.encounter_id=$1
        ORDER BY l.description ASC
      `,
        [encounterId]
      );
      return NextResponse.json(out.rows, { status: 200 });
    }

    // All lore
    const out = await query(
      `SELECT * FROM lore ORDER BY description ASC`
    );
    return NextResponse.json(out.rows, { status: 200 });
  } catch (err) {
    console.error("GET /lore error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   POST /api/lore
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
      INSERT INTO lore
        (description, notes, created_at, updated_at)
      VALUES ($1,$2, NOW(), NOW())
      RETURNING *
    `,
      [description, notes || ""]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /lore error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   PUT /api/lore?id=
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

    const { description, notes } = await req.json();

    const result = await query(
      `
      UPDATE lore
         SET description = COALESCE($2, description),
             notes       = COALESCE($3, notes),
             updated_at  = NOW()
       WHERE id=$1
       RETURNING *
    `,
      [id, description, notes]
    );

    if (result.rows.length === 0)
      return NextResponse.json({ error: "Lore not found" }, { status: 404 });

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (err) {
    console.error("PUT /lore error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/lore?id=
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
      `DELETE FROM lore WHERE id=$1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0)
      return NextResponse.json({ error: "Lore not found" }, { status: 404 });

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err) {
    console.error("DELETE /lore error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
