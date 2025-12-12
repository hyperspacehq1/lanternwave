import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fromDb, toDb } from "@/lib/campaignMapper";

/* -----------------------------------------------------------
   GET /api/campaigns/:id
------------------------------------------------------------ */
export async function GET(req, { params }) {
  try {
    const { id } = params;

    const rows = await sql`
      SELECT *
      FROM campaigns
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!rows.length) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(fromDb(rows[0]), { status: 200 });
  } catch (err) {
    console.error(`GET /api/campaigns/${params?.id} error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   PUT /api/campaigns/:id
   Partial update — only updates provided fields
------------------------------------------------------------ */
export async function PUT(req, { params }) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { id } = params;
    const incoming = await req.json();
    const dbVals = toDb(incoming);

    const sets = [];
    const values = [];

    if (incoming.name !== undefined) {
      sets.push(`name = $${sets.length + 1}`);
      values.push(dbVals.name);
    }

    if (incoming.description !== undefined) {
      sets.push(`description = $${sets.length + 1}`);
      values.push(dbVals.description);
    }

    if (incoming.worldSetting !== undefined) {
      sets.push(`world_setting = $${sets.length + 1}`);
      values.push(dbVals.world_setting);
    }

    if (incoming.campaignDate !== undefined) {
      sets.push(`campaign_date = $${sets.length + 1}`);
      values.push(dbVals.campaign_date);
    }

    if (sets.length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided to update" },
        { status: 400 }
      );
    }

    // Add updated_at always
    sets.push(`updated_at = NOW()`);

    // Add ID as final parameter
    values.push(id);

    const sqlText = `
      UPDATE campaigns
      SET ${sets.join(", ")}
      WHERE id = $${values.length}
      RETURNING *
    `;

    const result = await sql.query(sqlText, values);
    const updated = result.rows?.[0];

    if (!updated) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(fromDb(updated), { status: 200 });
  } catch (err) {
    console.error(`PUT /api/campaigns/${params?.id} error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/campaigns/:id
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { id } = params;

    const result = await sql.query(
      `DELETE FROM campaigns WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!result.rows?.length) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err) {
    console.error(`DELETE /api/campaigns/${params?.id} error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
