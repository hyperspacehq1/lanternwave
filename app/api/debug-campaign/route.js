// app/api/debug-campaign/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // If no ID: list all campaigns (id + name) for quick inspection
    if (!id) {
      const rows = await query(`
        SELECT id, name, created_at
        FROM campaigns
        ORDER BY created_at DESC
      `);

      return NextResponse.json(
        {
          mode: "list",
          count: rows.length,
          campaigns: rows,
        },
        { status: 200 }
      );
    }

    // If ID is provided: check if that campaign exists
    const rows = await query(
      `
      SELECT *
      FROM campaigns
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        {
          mode: "by-id",
          id,
          exists: false,
          campaign: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        mode: "by-id",
        id,
        exists: true,
        campaign: rows[0],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /debug-campaign error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
