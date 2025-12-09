// app/api/events/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/* -----------------------------------------------------------
   GET /api/events
------------------------------------------------------------ */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const sessionId = searchParams.get("session_id");
    const campaignId = searchParams.get("campaign_id");

    // ────────────────────────────────
    // SINGLE EVENT + linked data
    // ────────────────────────────────
    if (id) {
      const eventRes = await query(
        `SELECT * FROM events WHERE id=$1 LIMIT 1`,
        [id]
      );

      if (eventRes.rows.length === 0) {
        return NextResponse.json(
          { error: "Event not found" },
          { status: 404 }
        );
      }

      const eventRow = eventRes.rows[0];

      // NPCs
      const npcs = (
        await query(
          `
          SELECT npcs.*
          FROM event_npcs en
          JOIN npcs ON npcs.id = en.npc_id
          WHERE en.event_id=$1
        `,
          [id]
        )
      ).rows;

      // Locations
      const locations = (
        await query(
          `
          SELECT l.*
          FROM event_locations el
          JOIN locations l ON l.id = el.location_id
          WHERE el.event_id=$1
        `,
          [id]
        )
      ).rows;

      // Items
      const items = (
        await query(
          `
          SELECT i.*
          FROM event_items ei
          JOIN items i ON i.id = ei.item_id
          WHERE ei.event_id=$1
        `,
          [id]
        )
      ).rows;

      return NextResponse.json(
        { ...eventRow, npcs, locations, items },
        { status: 200 }
      );
    }

    // ────────────────────────────────
    // EVENTS FOR SESSION
    // ────────────────────────────────
    if (sessionId) {
      const result = await query(
        `
        SELECT *
        FROM events
        WHERE session_id=$1
        ORDER BY priority DESC, created_at ASC
      `,
        [sessionId]
      );
      return NextResponse.json(result.rows, { status: 200 });
    }

    // ────────────────────────────────
    // EVENTS FOR CAMPAIGN
    // ────────────────────────────────
    if (campaignId) {
      const result = await query(
        `
        SELECT *
        FROM events
        WHERE campaign_id=$1
        ORDER BY priority DESC, created_at ASC
      `,
        [campaignId]
      );
      return NextResponse.json(result.rows, { status: 200 });
    }

    return NextResponse.json(
      { error: "id, session_id, or campaign_id required" },
      { status: 400 }
    );
  } catch (err) {
    console.error("GET /events error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   POST /api/events
------------------------------------------------------------ */
export async function POST(req) {
  try {
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const {
      campaign_id,
      session_id,
      description,
      event_type,
      weather,
      trigger_detail,
      priority,
      countdown_minutes,
      npc_ids = [],
      location_ids = [],
      item_ids = [],
    } = body;

    if (!description) {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 }
      );
    }

    const result = await query(
      `
      INSERT INTO events
        (campaign_id, session_id, description, event_type, weather,
         trigger_detail, priority, countdown_minutes, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW(), NOW())
      RETURNING *
    `,
      [
        campaign_id || null,
        session_id || null,
        description,
        event_type || "Normal",
        weather || null,
        trigger_detail || "",
        priority || 1,
        countdown_minutes || null,
      ]
    );

    const eventRow = result.rows[0];
    const eventId = eventRow.id;

    // NPCs
    for (const npcId of npc_ids) {
      await query(
        `
        INSERT INTO event_npcs (event_id, npc_id)
        VALUES ($1,$2)
        ON CONFLICT DO NOTHING
      `,
        [eventId, npcId]
      );
    }

    // Locations
    for (const locId of location_ids) {
      await query(
        `
        INSERT INTO event_locations (event_id, location_id)
        VALUES ($1,$2)
        ON CONFLICT DO NOTHING
      `,
        [eventId, locId]
      );
    }

    // Items
    for (const itemId of item_ids) {
      await query(
        `
        INSERT INTO event_items (event_id, item_id)
        VALUES ($1,$2)
        ON CONFLICT DO NOTHING
      `,
        [eventId, itemId]
      );
    }

    return NextResponse.json(eventRow, { status: 201 });
  } catch (err) {
    console.error("POST /events error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   PUT /api/events?id=
------------------------------------------------------------ */
export async function PUT(req) {
  try {
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const body = await req.json();
    const {
      description,
      event_type,
      weather,
      trigger_detail,
      priority,
      countdown_minutes,
      npc_ids,
      location_ids,
      item_ids,
    } = body;

    const result = await query(
      `
      UPDATE events
         SET description       = COALESCE($2, description),
             event_type        = COALESCE($3, event_type),
             weather           = COALESCE($4, weather),
             trigger_detail    = COALESCE($5, trigger_detail),
             priority          = COALESCE($6, priority),
             countdown_minutes = COALESCE($7, countdown_minutes),
             updated_at        = NOW()
       WHERE id=$1
       RETURNING *
    `,
      [
        id,
        description,
        event_type,
        weather,
        trigger_detail,
        priority,
        countdown_minutes,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const updated = result.rows[0];

    // ──────────────────────────
    // REPLACE JOIN TABLES
    // ──────────────────────────

    if (npc_ids) {
      await query(`DELETE FROM event_npcs WHERE event_id=$1`, [id]);
      for (const npcId of npc_ids) {
        await query(
          `INSERT INTO event_npcs (event_id,npc_id) VALUES ($1,$2)`,
          [id, npcId]
        );
      }
    }

    if (location_ids) {
      await query(`DELETE FROM event_locations WHERE event_id=$1`, [id]);
      for (const locId of location_ids) {
        await query(
          `INSERT INTO event_locations (event_id,location_id) VALUES ($1,$2)`,
          [id, locId]
        );
      }
    }

    if (item_ids) {
      await query(`DELETE FROM event_items WHERE event_id=$1`, [id]);
      for (const itemId of item_ids) {
        await query(
          `INSERT INTO event_items (event_id,item_id) VALUES ($1,$2)`,
          [id, itemId]
        );
      }
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("PUT /events error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   DELETE /api/events?id=
------------------------------------------------------------ */
export async function DELETE(req) {
  try {
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const result = await query(
      `DELETE FROM events WHERE id=$1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err) {
    console.error("DELETE /events error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
