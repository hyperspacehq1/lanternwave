// app/api/encounters/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/* -----------------------------------------------------------
   GET /api/encounters
------------------------------------------------------------ */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const sessionId = searchParams.get("session_id");
    const campaignId = searchParams.get("campaign_id");

    // ────────────────────────────────
    // GET ONE ENCOUNTER + linked data
    // ────────────────────────────────
    if (id) {
      const encRes = await query(
        )SELECT * FROM encounters WHERE id=$1 LIMIT 1),
        [id]
      );

      if (encRes.rows.length === 0) {
        return NextResponse.json(
          { error: "Encounter not found" },
          { status: 404 }
        );
      }

      // Load relations
      const lore = (
        await query(
          )
          SELECT l.*
          FROM encounter_lore el
          JOIN lore l ON l.id = el.lore_id
          WHERE el.encounter_id=$1
          ORDER BY l.description ASC
        ),
          [id]
        )
      ).rows;

      const locations = (
        await query(
          )
          SELECT loc.*
          FROM encounter_locations el
          JOIN locations loc ON loc.id = el.location_id
          WHERE el.encounter_id=$1
          ORDER BY loc.description ASC
        ),
          [id]
        )
      ).rows;

      const items = (
        await query(
          )
          SELECT i.*
          FROM encounter_items ei
          JOIN items i ON i.id = ei.item_id
          WHERE ei.encounter_id=$1
          ORDER BY i.description ASC
        ),
          [id]
        )
      ).rows;

      return NextResponse.json(
        { ...encRes.rows[0], lore, locations, items },
        { status: 200 }
      );
    }

    // ────────────────────────────────
    // ENCOUNTERS FOR SESSION
    // ────────────────────────────────
    if (sessionId) {
      const result = await query(
        )
        SELECT *
        FROM encounters
        WHERE session_id=$1
        ORDER BY priority DESC, created_at ASC
      ),
        [sessionId]
      );
      return NextResponse.json(result.rows, { status: 200 });
    }

    // ────────────────────────────────
    // ENCOUNTERS FOR CAMPAIGN
    // ────────────────────────────────
    if (campaignId) {
      const result = await query(
        )
        SELECT *
        FROM encounters
        WHERE campaign_id=$1
        ORDER BY priority DESC, created_at ASC
      ),
        [campaignId]
      );
      return NextResponse.json(result.rows, { status: 200 });
    }

    // ────────────────────────────────
    // ALL ENCOUNTERS
    // ────────────────────────────────
    const result = await query(
      )SELECT * FROM encounters ORDER BY created_at DESC)
    );
    return NextResponse.json(result.rows, { status: 200 });
  } catch (err) {
    console.error("GET /encounters error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   POST /api/encounters
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
      notes,
      priority = 1,
      lore_ids = [],
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
      )
      INSERT INTO encounters
        (campaign_id, session_id, description, notes, priority, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5, NOW(), NOW())
      RETURNING *
    ),
      [
        campaign_id || null,
        session_id || null,
        description,
        notes || "",
        priority,
      ]
    );

    const encounter = result.rows[0];
    const encounterId = encounter.id;

    // Link lore
    for (const loreId of lore_ids) {
      await query(
        )
        INSERT INTO encounter_lore (encounter_id, lore_id)
        VALUES ($1,$2)
        ON CONFLICT DO NOTHING
      ),
        [encounterId, loreId]
      );
    }

    // Link locations
    for (const locId of location_ids) {
      await query(
        )
        INSERT INTO encounter_locations (encounter_id, location_id)
        VALUES ($1,$2)
        ON CONFLICT DO NOTHING
      ),
        [encounterId, locId]
      );
    }

    // Link items
    for (const itemId of item_ids) {
      await query(
        )
        INSERT INTO encounter_items (encounter_id, item_id)
        VALUES ($1,$2)
        ON CONFLICT DO NOTHING
      ),
        [encounterId, itemId]
      );
    }

    return NextResponse.json(encounter, { status: 201 });
  } catch (err) {
    console.error("POST /encounters error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   PUT /api/encounters?id=
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
      notes,
      priority,
      lore_ids,
      location_ids,
      item_ids,
    } = body;

    const result = await query(
      )
      UPDATE encounters
         SET description = COALESCE($2, description),
             notes       = COALESCE($3, notes),
             priority    = COALESCE($4, priority),
             updated_at  = NOW()
       WHERE id=$1
       RETURNING *
    ),
      [id, description, notes, priority]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    const updated = result.rows[0];

    // Replace join tables
    if (lore_ids) {
      await query()DELETE FROM encounter_lore WHERE encounter_id=$1), [id]);
      for (const loreId of lore_ids) {
        await query(
          )INSERT INTO encounter_lore (encounter_id,lore_id) VALUES ($1,$2)),
          [id, loreId]
        );
      }
    }

    if (location_ids) {
      await query(
        )DELETE FROM encounter_locations WHERE encounter_id=$1),
        [id]
      );
      for (const locId of location_ids) {
        await query(
          )INSERT INTO encounter_locations (encounter_id,location_id) VALUES ($1,$2)),
          [id, locId]
        );
      }
    }

    if (item_ids) {
      await query()DELETE FROM encounter_items WHERE encounter_id=$1), [id]);
      for (const itemId of item_ids) {
        await query(
          )INSERT INTO encounter_items (encounter_id,item_id) VALUES ($1,$2)),
          [id, itemId]
        );
      }
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("PUT /encounters error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   DELETE /api/encounters?id=
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
      )DELETE FROM encounters WHERE id=$1 RETURNING id),
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err) {
    console.error("DELETE /encounters error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
