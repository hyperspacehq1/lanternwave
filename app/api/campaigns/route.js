// app/api/campaigns/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fromDb, toDb } from "@/lib/campaignMapper";

/* -----------------------------------------------------------
   GET /api/campaigns  → list all campaigns
------------------------------------------------------------ */
export async function GET() {
  try {
    const rows = await query`
      SELECT *
      FROM campaigns
      ORDER BY created_at DESC
    `;

    return NextResponse.json(rows.map(fromDb), { status: 200 });
  } catch (err) {
    console.error("GET /api/campaigns error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   POST /api/campaigns  → create campaign
   Accepts camelCase input, uses mapper to convert
------------------------------------------------------------ */
export async function POST(req) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const dbVals = toDb(body);

    const rows = await query`
      INSERT INTO campaigns
        (name, description, world_setting, campaign_date, created_at, updated_at)
      VALUES
        (
          ${dbVals.name},
          ${dbVals.description},
          ${dbVals.world_setting},
          ${dbVals.campaign_date},
          NOW(),
          NOW()
        )
      RETURNING *
    `;

    return NextResponse.json(fromDb(rows[0]), { status: 201 });
  } catch (err) {
    console.error("POST /api/campaigns error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
