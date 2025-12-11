// app/api/campaigns/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

/* -----------------------------------------------------------
   GET /api/campaigns
   GET /api/campaigns?id=UUID
------------------------------------------------------------ */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const rows = await query(
        `SELECT *
           FROM campaigns
          WHERE id = $1
          LIMIT 1`,
        [id]
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }

      return NextResponse.json(rows[0], { status: 200 });
    }

    const rows = await query(
      `SELECT *
         FROM campaigns
        ORDER BY created_at DESC`
    );

    return NextResponse.json(rows, { status: 200 });

  } catch (err) {
    console.error("GET /campaigns error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   POST /api/campaigns
------------------------------------------------------------ */
export async function POST(req) {
  try {
    // Admin check disabled for development
    
    const body = await req.json();
    const { name, description, world_setting, campaign_date } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const id = randomUUID();

    const rows = await query(
      `
      INSERT INTO campaigns
        (id, name, description, world_setting, campaign_date, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
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

    const inserted = Array.isArray(rows) ? rows[0] : rows;
    return NextResponse.json(inserted, { status: 201 });

  } catch (err) {
    console.error("POST /campaigns error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   PUT /api/campaigns?id=UUID
------------------------------------------------------------ */
export async function PUT(req) {
  try {
    // Admin check disabled for development
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const body = await req.json();
    const { name, description, world_setting, campaign_date } = body;

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

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const updated = Array.isArray(rows) ? rows[0] : rows;
    return NextResponse.json(updated, { status: 200 });

  } catch (err) {
    console.error("PUT /campaigns error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/campaigns?id=UUID
------------------------------------------------------------ */
export async function DELETE(req) {
  try {
    // Admin check disabled for development
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const rows = await query(
      `DELETE FROM campaigns
        WHERE id = $1
        RETURNING id`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id }, { status: 200 });

  } catch (err) {
    console.error("DELETE /campaigns error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
