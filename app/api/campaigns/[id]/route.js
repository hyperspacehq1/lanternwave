// app/api/campaigns/[id]/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fromDb, toDb } from "@/lib/campaignMapper";

/* -----------------------------------------------------------
   GET /api/campaigns/:id
------------------------------------------------------------ */
export async function GET(req, { params }) {
  try {
    const { id } = params;

    const rows = await query`
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
    console.error(`GET /api/campaigns/${params.id} error:`, err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   PUT /api/campaigns/:id → PARTIAL UPDATE
   Only updates keys included in the JSON body.
------------------------------------------------------------ */
export async function PUT(req, { params }) {
  try {
    const admin = requireAdmin(req);
    if (!admin.ok) return admin.response;

    const { id } = params;
    const incoming = await req.json();
    const dbVals = toDb(incoming);

    // Build partial update SQL dynamically based on keys present
    const updates = [];
    const values = [];

    if (incoming.name !== undefined) {
      updates.push(`name = ${values.push(dbVals.name) && `$${values.length}`}`);
    }
    if (incoming.description !== undefined) {
      updates.push(`description = ${values.push(dbVals.description) && `$${values.length}`}`);
    }
    if (incoming.worldSetting !== undefined) {
      updates.push(`world_setting = ${values.push(dbVals.world_setting) && `$${values.length}`}`);
    }
    if (incoming.campaignDate !== undefined) {
      updates.push(`campaign_date = ${values.push(dbVals.campaign_date) && `$${values.length}`}`);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided to update" },
        { status: 400 }
      );
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    const sql = `
      UPDATE campaigns
      SET ${updates.join(", ")}
      WHERE id = $${values.push(id) /* add id as last value */}
      RETURNING *
    `;

    const rows = await query(sql, values);

    if (!rows.length) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(fromDb(rows[0]), { status: 200 });
  } catch (err) {
    console.error(`PUT /api/campaigns/${params.id} error:`, err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   DELETE /api/campaigns/:id
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  try {
    const admin = requireAdmin(req);
    if (!admin.ok) return admin.response;

    const { id } = params;

    const rows = await query`
      DELETE FROM campaigns
      WHERE id = ${id}
      RETURNING id
    `;

    if (!rows.length) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err) {
    console.error(`DELETE /api/campaigns/${params.id} error:`, err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
