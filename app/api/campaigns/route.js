// app/api/campaigns/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

/* -----------------------------------------------------------
   GET /api/campaigns   → List all campaigns
------------------------------------------------------------ */
export async function GET() {
  try {
    const rows = await query(`
      SELECT *
      FROM campaigns
      ORDER BY created_at DESC
    `);

    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    console.error("GET /campaigns error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   POST /api/campaigns   → Create a new campaign
------------------------------------------------------------ */
export async function POST(req) {
  try {
    const { name, description, world_setting, campaign_date } = await req.json();

    if (!name)
      return NextResponse.json({ error: "name is required" }, { status: 400 });

    const id = randomUUID();

    const rows = await query(
      `
      INSERT INTO campaigns
        (id, name, description, world_setting, campaign_date, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
      `,
      [
        id,
        name,
        description || "",
        world_setting || "",
        campaign_date || null
      ]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /campaigns error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
