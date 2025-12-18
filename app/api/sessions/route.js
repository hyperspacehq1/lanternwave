import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/sessions
   Optional:
     ?id=
     ?campaign_id=
------------------------------------------------------------ */
export async function GET(req) {
  try {
    const { tenantId } = await getTenantContext(req);
    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");
    const campaignId = searchParams.get("campaign_id");

    // Single session by id
    if (id) {
      const { rows } = await query(
        `
        SELECT *
          FROM sessions
         WHERE tenant_id = $1
           AND id = $2
           AND deleted_at IS NULL
         LIMIT 1
        `,
        [tenantId, id]
      );

      return Response.json(rows[0] ?? null);
    }

    // Sessions for a campaign
    if (campaignId) {
      const { rows } = await query(
        `
        SELECT *
          FROM sessions
         WHERE tenant_id = $1
           AND campaign_id = $2
           AND deleted_at IS NULL
         ORDER BY created_at ASC
        `,
        [tenantId, campaignId]
      );

      return Response.json(rows);
    }

    // IMPORTANT:
    // For Campaign Manager tabs, a plain list must NEVER error.
    // Return empty list instead of 400.
    return Response.json([]);
  } catch (err) {
    console.error("GET /api/sessions failed", err);
    return Response.json([], { status: 200 });
  }
}

/* -----------------------------------------------------------
   POST /api/sessions
------------------------------------------------------------ */
export async function POST(req) {
  try {
    const { tenantId } = await getTenantContext(req);
    const body = await req.json();

    if (!body?.campaign_id) {
      return Response.json(
        { error: "campaign_id is required" },
        { status: 400 }
      );
    }

    // Validate campaign ownership
    const campaign = await query(
      `
      SELECT id
        FROM campaigns
       WHERE tenant_id = $1
         AND id = $2
         AND deleted_at IS NULL
       LIMIT 1
      `,
      [tenantId, body.campaign_id]
    );

    if (!campaign.rows.length) {
      return Response.json(
        { error: "Invalid campaign_id" },
        { status: 403 }
      );
    }

    const { rows } = await query(
      `
      INSERT INTO sessions (
        tenant_id,
        campaign_id,
        description,
        geography,
        notes,
        history
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        tenantId,
        body.campaign_id,
        body.description ?? null,
        body.geography ?? null,
        body.notes ?? null,
        body.history ?? null,
      ]
    );

    return Response.json(rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/sessions failed", err);
    return Response.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   PUT /api/sessions?id=
------------------------------------------------------------ */
export async function PUT(req) {
  try {
    const { tenantId } = await getTenantContext(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const body = await req.json();

    const { rows } = await query(
      `
      UPDATE sessions
         SET description = COALESCE($3, description),
             geography  = COALESCE($4, geography),
             notes      = COALESCE($5, notes),
             history    = COALESCE($6, history),
             updated_at = NOW()
       WHERE tenant_id = $1
         AND id = $2
         AND deleted_at IS NULL
       RETURNING *
      `,
      [
        tenantId,
        id,
        body.description,
        body.geography,
        body.notes,
        body.history,
      ]
    );

    return Response.json(rows[0] ?? null);
  } catch (err) {
    console.error("PUT /api/sessions failed", err);
    return Response.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   DELETE /api/sessions?id=
   (soft delete)
------------------------------------------------------------ */
export async function DELETE(req) {
  try {
    const { tenantId } = await getTenantContext(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const { rows } = await query(
      `
      UPDATE sessions
         SET deleted_at = NOW()
       WHERE tenant_id = $1
         AND id = $2
         AND deleted_at IS NULL
       RETURNING id
      `,
      [tenantId, id]
    );

    return Response.json({ success: true, id: rows[0]?.id ?? id });
  } catch (err) {
    console.error("DELETE /api/sessions failed", err);
    return Response.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
