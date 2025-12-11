// app/api/campaigns/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fromDb, toDb } from "@/app/api/campaigns/campaignMapper";

/* -----------------------------------------------------------
   GET /api/campaigns  → Return all campaigns
------------------------------------------------------------ */
export async function GET() {
  try {
    const rows = await query`
      SELECT *
      FROM campaigns
      ORDER BY created_at DESC
    `;

    const mapped = rows.map(fromDb);
    return NextResponse.json(mapped, { status: 200 });
  } catch (err) {
    console.error("GET /api/campaigns error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   POST /api/campaigns  → Create a campaign
   Body (camelCase):
   {
     name,
     description?,
     worldSetting?,
     campaignDate?
   }
------------------------------------------------------------ */
export async function POST(req) {
  try {
    const admin = requireAdmin(req);
    if (!admin.ok) return admin.response;

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    // Convert camelCase → snake_case
    const dbVals = toDb(body);

    const rows = await query`
      INSERT INTO campaigns (
        name,
        description,
        world_setting,
        campaign_date,
        created_at,
        updated_at
      )
      VALUES (
        ${dbVals.name},
        ${dbVals.description},
        ${dbVals.world_setting},
        ${dbVals.campaign_date},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    const campaign = fromDb(rows[0]);
    return NextResponse.json(campaign, { status: 201 });
  } catch (err) {
    console.error("POST /api/campaigns error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
