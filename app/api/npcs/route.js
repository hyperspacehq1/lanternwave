import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/* -----------------------------------------------------------
   GET /api/npcs
------------------------------------------------------------ */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const campaignId = searchParams.get("campaign_id");
    const sessionId = searchParams.get("session_id");

    // ───────────── Single NPC
    if (id) {
      const npcRes = await query(
        `SELECT * FROM npcs WHERE id=$1 LIMIT 1`,
        [id]
      );

      if (npcRes.rows.length === 0) {
        return NextResponse.json({ error: "NPC not found" }, { status: 404 });
      }

      const events = (
        await query(
          `
          SELECT e.*
          FROM event_npcs en
          JOIN events e ON e.id = en.event_id
          WHERE en.npc_id=$1
          ORDER BY e.created_at ASC
        `,
          [id]
        )
      ).rows;

      return NextResponse.json(
        { ...npcRes.rows[0], events },
        { status: 200 }
      );
    }

    // NPCs by campaign
    if (campaignId) {
      const result = await query(
        `
        SELECT DISTINCT n.*
        FROM npcs n
        JOIN event_npcs en ON en.npc_id=n.id
        JOIN events e ON e.id=en.event_id
        WHERE e.campaign_id=$1
        ORDER BY n.first_name ASC, n.last_name ASC
      `,
        [campaignId]
      );
      return NextResponse.json(result.rows, { status: 200 });
    }

    // NPCs by session
    if (sessionId) {
      const result = await query(
        `
        SELECT DISTINCT n.*
        FROM npcs n
        JOIN event_npcs en ON en.npc_id=n.id
        JOIN events e ON e.id=en.event_id
        WHERE e.session_id=$1
        ORDER BY n.first_name ASC, n.last_name ASC
      `,
        [sessionId]
      );
      return NextResponse.json(result.rows, { status: 200 });
    }

    // All NPCs
    const result = await query(
      `SELECT * FROM npcs ORDER BY first_name ASC, last_name ASC`
    );

    return NextResponse.json(result.rows, { status: 200 });
  } catch (err) {
    console.error("GET /npcs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   POST /api/npcs
------------------------------------------------------------ */
export async function POST(req) {
  try {
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const {
      first_name,
      last_name,
      npc_type,
      data,
      personality,
      goals,
      faction_alignment,
      secrets,
      state,
    } = await req.json();

    if (!first_name)
      return NextResponse.json({ error: "first_name is required" }, { status: 400 });

    const result = await query(
      `
      INSERT INTO npcs
        (first_name, last_name, npc_type, data, personality, goals,
         faction_alignment, secrets, state, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW(), NOW())
      RETURNING *
    `,
      [
        first_name,
        last_name || "",
        npc_type || "neutral",
        data || "",
        personality || "",
        goals || "",
        faction_alignment || "",
        secrets || "",
        state || "alive",
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /npcs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   PUT /api/npcs?id=
------------------------------------------------------------ */
export async function PUT(req) {
  try {
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const body = await req.json();

    const result = await query(
      `
      UPDATE npcs
         SET first_name        = COALESCE($2, first_name),
             last_name         = COALESCE($3, last_name),
             npc_type          = COALESCE($4, npc_type),
             data              = COALESCE($5, data),
             personality       = COALESCE($6, personality),
             goals             = COALESCE($7, goals),
             faction_alignment = COALESCE($8, faction_alignment),
             secrets           = COALESCE($9, secrets),
             state             = COALESCE($10, state),
             updated_at        = NOW()
       WHERE id=$1
       RETURNING *
    `,
      [
        id,
        body.first_name,
        body.last_name,
        body.npc_type,
        body.data,
        body.personality,
        body.goals,
        body.faction_alignment,
        body.secrets,
        body.state,
      ]
    );

    if (result.rows.length === 0)
      return NextResponse.json({ error: "NPC not found" }, { status: 404 });

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (err) {
    console.error("PUT /npcs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/npcs?id=
------------------------------------------------------------ */
export async function DELETE(req) {
  try {
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const result = await query(
      `DELETE FROM npcs WHERE id=$1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0)
      return NextResponse.json({ error: "NPC not found" }, { status: 404 });

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err) {
    console.error("DELETE /npcs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
