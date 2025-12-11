// app/api/campaigns/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";
import { toDb, fromDb } from "@/lib/campaignMapper";

// Extract optional :id from URL path
function getIdFromPath(req) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length === 3) return parts[2];
  return null;
}

/* -----------------------------------------------------------
   GET /api/campaigns           -> list all
   GET /api/campaigns/:id       -> get one (camelCase)
------------------------------------------------------------ */
export async function GET(req) {
  try {
    const id = getIdFromPath(req);

    if (id) {
      const rows = await query(
        `SELECT * FROM campaigns WHERE id = $1 LIMIT 1`,
        [id]
      );

      if (!rows || rows.length === 0)
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

      return NextResponse.json(fromDb(rows[0]), { status: 200 });
    }

    const rows = await query(`SELECT * FROM campaigns ORDER BY created_at DESC`);
    return NextResponse.json(rows.map(fromDb), { status: 200 });

  } catch (err) {
    console.error("GET /campaigns error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   POST /api/campaigns          -> create (camelCase input)
------------------------------------------------------------ */
export async function POST(req) {
  try {
    const body = await req.json();
    const data = toDb(body);

    if (!data.name)
      return NextResponse.json({ error: "name is required" }, { status: 400 });

    const id = randomUUID();

    const rows = await query(
      `
      INSERT INTO campaigns
      (id, name, description, world_setting, campaign_date, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
      RETURNING *
      `,
      [
        id,
        data.name,
        data.description,
        data.world_setting,
        data.campaign_date
      ]
    );

    return NextResponse.json(fromDb(rows[0]), { status: 201 });

  } catch (err) {
    console.error("POST /campaigns error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   PUT /api/campaigns/:id       -> update (camelCase input)
------------------------------------------------------------ */
export async function PUT(req) {
  try {
    const id = getIdFromPath(req);
    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });

    const body = await req.json();
    const data = toDb(body);

    const rows = await query(
      `
      UPDATE campaigns
         SET name=$2,
             description=$3,
             world_setting=$4,
             campaign_date=$5,
             updated_at=NOW()
       WHERE id=$1
       RETURNING *
      `,
      [
        id,
        data.name,
        data.description,
        data.world_setting,
        data.campaign_date
      ]
    );

    if (!rows || rows.length === 0)
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    return NextResponse.json(fromDb(rows[0]), { status: 200 });

  } catch (err) {
    console.error("PUT /campaigns/:id error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/campaigns/:id    -> delete
------------------------------------------------------------ */
export async function DELETE(req) {
  try {
    const id = getIdFromPath(req);
    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });

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
