// app/api/campaigns/[id]/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

/* -----------------------------------------------------------
   GET /api/campaigns/:id   → Get one campaign
------------------------------------------------------------ */
export async function GET(req, { params }) {
  try {
    const id = params.id;

    const rows = await query(
      `SELECT * FROM campaigns WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0)
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("GET /campaigns/:id error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   PUT /api/campaigns/:id   → Update a campaign
------------------------------------------------------------ */
export async function PUT(req, { params }) {
  try {
    const id = params.id;
    const { name, description, world_setting, campaign_date } = await req.json();

    const rows = await query(
      `
      UPDATE campaigns
         SET name          = COALESCE($2, name),
             description   = COALESCE($3, description),
             world_setting = COALESCE($4, world_setting),
             campaign_date = COALESCE($5, campaign_date),
             updated_at    = NOW()
       WHERE id = $1
       RETURNING *
      `,
      [id, name, description, world_setting, campaign_date]
    );

    if (!rows || rows.length === 0)
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    return NextResponse.json(rows[0], { status: 200 });
  } catch (err) {
    console.error("PUT /campaigns/:id error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/campaigns/:id   → Delete a campaign
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  try {
    const id = params.id;

    const rows = await query(
      `DELETE FROM campaigns WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!rows || rows.length === 0)
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err) {
    console.error("DELETE /campaigns/:id error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
