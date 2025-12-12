import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fromDb, toDb } from "@/lib/campaignMapper";

/* -----------------------------------------------------------
   GET /api/campaigns
------------------------------------------------------------ */
export async function GET() {
  try {
    const rows = await sql`
      SELECT *
      FROM campaigns
      ORDER BY created_at DESC
    `;

    return NextResponse.json(rows.map(fromDb), { status: 200 });
  } catch (err) {
    console.error("GET /api/campaigns error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   POST /api/campaigns
------------------------------------------------------------ */
export async function POST(req) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const dbVals = toDb(body);

    const result = await sql.query(
      `
      INSERT INTO campaigns
        (name, description, world_setting, campaign_date, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
      `,
      [
        dbVals.name,
        dbVals.description,
        dbVals.world_setting,
        dbVals.campaign_date
      ]
    );

    return NextResponse.json(fromDb(result.rows[0]), { status: 201 });
  } catch (err) {
    console.error("POST /api/campaigns error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
