// app/api/conditions/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

/* -----------------------------------------------------------
   GET /api/conditions → List all conditions
------------------------------------------------------------ */
export async function GET() {
  try {
    const rows = await query`
      SELECT *
      FROM conditions
      ORDER BY created_at DESC
    `;

    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    console.error("GET /api/conditions error:", err);
    return NextResponse.json({ error: "Failed to load conditions" }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   POST /api/conditions
------------------------------------------------------------ */
export async function POST(req) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();

    const id = body.id || uuidv4();

    const rows = await query`
      INSERT INTO conditions (
        id,
        target_id,
        target_type,
        condition,
        severity,
        duration,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        ${id},
        ${body.targetId},
        ${body.targetType},
        ${body.condition},
        ${body.severity ?? null},
        ${body.duration ?? null},
        ${body.notes ?? null},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/conditions error:", err);
    return NextResponse.json({ error: "Failed to create condition" }, { status: 500 });
  }
}
