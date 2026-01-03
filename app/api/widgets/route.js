import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/getTenantContext";

/* -------------------------------------------------
   GET /api/players
   Campaign-scoped list
-------------------------------------------------- */
export async function GET(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id");

  if (!campaignId) {
    return NextResponse.json(
      { error: "campaign_id is required" },
      { status: 400 }
    );
  }

  const { rows } = await query(
    `
    SELECT *
    FROM players
    WHERE tenant_id = $1
      AND campaign_id = $2
      AND deleted_at IS NULL
    ORDER BY created_at ASC
    `,
    [tenantId, campaignId]
  );

  return NextResponse.json(rows);
}

/* -------------------------------------------------
   POST /api/players
   Create new player
-------------------------------------------------- */
export async function POST(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  if (!body.campaign_id) {
    return NextResponse.json(
      { error: "campaign_id is required" },
      { status: 400 }
    );
  }

  const fields = [
    "tenant_id",
    "campaign_id",
    "first_name",
    "last_name",
    "character_name",
    "notes",
    "phone",
    "email",
    "initiative_score",
  ];

  const values = [
    tenantId,
    body.campaign_id,
    body.first_name ?? null,
    body.last_name ?? null,
    body.character_name ?? null,
    body.notes ?? null,
    body.phone ?? null,
    body.email ?? null,
    body.initiative_score ?? null,
  ];

  // 🔑 Conditionally include initiative_bonus
  if (body.initiative_bonus != null) {
    fields.push("initiative_bonus");
    values.push(body.initiative_bonus);
  }

  const placeholders = fields.map((_, i) => `$${i + 1}`).join(", ");

  const { rows } = await query(
    `
    INSERT INTO players (${fields.join(", ")})
    VALUES (${placeholders})
    RETURNING *
    `,
    values
  );

  return NextResponse.json(rows[0], { status: 201 });
}

/* -------------------------------------------------
   PUT /api/players
   Update existing player
-------------------------------------------------- */
export async function PUT(req) {
  const { tenantId } = await getTenantContext(req);
  const body = await req.json();

  if (!body.id) {
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 }
    );
  }

  const updates = [];
  const values = [];
  let i = 1;

  function set(field, value) {
    updates.push(`${field} = $${i++}`);
    values.push(value);
  }

  if ("first_name" in body) set("first_name", body.first_name);
  if ("last_name" in body) set("last_name", body.last_name);
  if ("character_name" in body) set("character_name", body.character_name);
  if ("notes" in body) set("notes", body.notes);
  if ("phone" in body) set("phone", body.phone);
  if ("email" in body) set("email", body.email);
  if ("initiative_score" in body)
    set("initiative_score", body.initiative_score);
  if ("initiative_bonus" in body)
    set("initiative_bonus", body.initiative_bonus);

  if (!updates.length) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  values.push(tenantId, body.id);

  const { rows } = await query(
    `
    UPDATE players
    SET ${updates.join(", ")},
        updated_at = now()
    WHERE tenant_id = $${i++}
      AND id = $${i}
    RETURNING *
    `,
    values
  );

  return NextResponse.json(rows[0]);
}

/* -------------------------------------------------
   DELETE /api/players
   Soft delete
-------------------------------------------------- */
export async function DELETE(req) {
  const { tenantId } = await getTenantContext(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 }
    );
  }

  await query(
    `
    UPDATE players
    SET deleted_at = now()
    WHERE tenant_id = $1
      AND id = $2
    `,
    [tenantId, id]
  );

  return NextResponse.json({ success: true });
}
