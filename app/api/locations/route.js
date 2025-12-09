import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const eventId = searchParams.get("event_id");
    const sessionId = searchParams.get("session_id");
    const campaignId = searchParams.get("campaign_id");

    if (id) {
      const locRes = await query(
        `SELECT * FROM locations WHERE id=$1 LIMIT 1`,
        [id]
      );

      if (locRes.rows.length === 0)
        return NextResponse.json({ error: "Location not found" }, { status: 404 });

      const events = (
        await query(
          `
          SELECT e.*
          FROM event_locations el
          JOIN events e ON e.id = el.event_id
          WHERE el.location_id=$1
          ORDER BY e.created_at ASC
        `,
          [id]
        )
      ).rows;

      return NextResponse.json(
        { ...locRes.rows[0], events },
        { status: 200 }
      );
    }

    if (eventId) {
      const out = await query(
        `
        SELECT l.*
        FROM event_locations el
        JOIN locations l ON l.id = el.location_id
        WHERE el.event_id=$1
        ORDER BY l.description ASC
      `,
        [eventId]
      );
      return NextResponse.json(out.rows, { status: 200 });
    }

    if (sessionId) {
      const out = await query(
        `
        SELECT DISTINCT l.*
        FROM event_locations el
        JOIN locations l ON l.id = el.location_id
        JOIN events e ON e.id = el.event_id
        WHERE e.session_id=$1
        ORDER BY l.description ASC
      `,
        [sessionId]
      );
      return NextResponse.json(out.rows, { status: 200 });
    }

    if (campaignId) {
      const out = await query(
        `
        SELECT DISTINCT l.*
        FROM event_locations el
        JOIN locations l ON l.id = el.location_id
        JOIN events e ON e.id = el.event_id
        WHERE e.campaign_id=$1
        ORDER BY l.description ASC
      `,
        [campaignId]
      );
      return NextResponse.json(out.rows, { status: 200 });
    }

    const out = await query(
      `SELECT * FROM locations ORDER BY description ASC`
    );
    return NextResponse.json(out.rows, { status: 200 });
  } catch (err) {
    console.error("GET /locations error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const {
      description,
      street,
      city,
      state,
      zip,
      notes,
      secrets,
      points_of_interest,
    } = body;

    if (!description)
      return NextResponse.json({ error: "description is required" }, { status: 400 });

    const result = await query(
      `
      INSERT INTO locations
        (description, street, city, state, zip, notes, secrets,
         points_of_interest, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW(), NOW())
      RETURNING *
    `,
      [
        description,
        street || "",
        city || "",
        state || "",
        zip || "",
        notes || "",
        secrets || "",
        points_of_interest || "",
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /locations error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const body = await req.json();

    const result = await query(
      `
      UPDATE locations
         SET description        = COALESCE($2, description),
             street             = COALESCE($3, street),
             city               = COALESCE($4, city),
             state              = COALESCE($5, state),
             zip                = COALESCE($6, zip),
             notes              = COALESCE($7, notes),
             secrets            = COALESCE($8, secrets),
             points_of_interest = COALESCE($9, points_of_interest),
             updated_at         = NOW()
       WHERE id=$1
       RETURNING *
    `,
      [
        id,
        body.description,
        body.street,
        body.city,
        body.state,
        body.zip,
        body.notes,
        body.secrets,
        body.points_of_interest,
      ]
    );

    if (result.rows.length === 0)
      return NextResponse.json({ error: "Location not found" }, { status: 404 });

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (err) {
    console.error("PUT /locations error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const result = await query(
      `DELETE FROM locations WHERE id=$1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0)
      return NextResponse.json({ error: "Location not found" }, { status: 404 });

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err) {
    console.error("DELETE /locations error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
