// app/api/campaigns/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

/**
 * Helper: extract optional :id from the path.
 * 
 * /api/campaigns              -> id = null
 * /api/campaigns/123          -> id = "123"
 */
function getIdFromPath(req) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // parts: ["api", "campaigns"] OR ["api", "campaigns", "<id>"]
  if (parts.length === 3) {
    return parts[2];
  }
  return null;
}

/* -----------------------------------------------------------
   GET /api/campaigns           -> list all
   GET /api/campaigns/:id       -> get one
------------------------------------------------------------ */
export async function GET(req) {
  try {
    const id = getIdFromPath(req);

    if (id) {
      const rows = await query(
        `SELECT * FROM campaigns WHERE id = $1 LIMIT 1`,
        [id]
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json(
          { error: "Campaign not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(rows[0], { status: 200 });
    }

    // No id -> list all campaigns
    const rows = await query(
      `SELECT * FROM campaigns ORDER BY created_at DESC`
    );

    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    console.error("GET /campaigns error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   POST /api/campaigns          -> create
------------------------------------------------------------ */
export async function POST(req) {
  try {
    const idInPath = getIdFromPath(req);
    if (idInPath) {
      // We don't support POST /api/campaigns/:id
      return NextResponse.json(
        { error: "Use PUT for updates, not POST" },
        { status: 405 }
      );
    }

    const { name, description, world_setting, campaign_date } =
      await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

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
        campaign_date || null,
      ]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /campaigns error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   PUT /api/campaigns/:id       -> update
------------------------------------------------------------ */
export async function PUT(req) {
  try {
    const id = getIdFromPath(req);
    if (!id) {
      return NextResponse.json(
        { error: "id is required in path /api/campaigns/:id" },
        { status: 400 }
      );
    }

    const { name, description, world_setting, campaign_date } =
      await req.json();

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
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0], { status: 200 });
  } catch (err) {
    console.error("PUT /campaigns/:id error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   DELETE /api/campaigns/:id    -> delete
------------------------------------------------------------ */
export async function DELETE(req) {
  try {
    const id = getIdFromPath(req);
    if (!id) {
      return NextResponse.json(
        { error: "id is required in path /api/campaigns/:id" },
        { status: 400 }
      );
    }

    const rows = await query(
      `DELETE FROM campaigns WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err) {
    console.error("DELETE /campaigns/:id error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
