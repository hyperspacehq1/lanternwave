import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/sessions
------------------------------------------------------------ */
export async function GET(req) {
  try {
    const { tenantId } = await getTenantContext(req);
    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");
    const campaignId = searchParams.get("campaign_id");

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

      return Response.json(
        rows[0]
          ? sanitizeRow(rows[0], {
              name: 120,
              description: 10000,
              notes: 10000,
            })
          : null
      );
    }

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

      return Response.json(
        sanitizeRows(rows, {
          name: 120,
          description: 10000,
          notes: 10000,
        })
      );
    }

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

    if (!body?.name || !body.name.trim()) {
      return Response.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

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
        name,
        description,
        notes
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        tenantId,
        body.campaign_id,
        body.name.trim(),
        body.description ?? null,
        body.notes ?? null,
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
         SET name        = COALESCE($3, name),
             description = COALESCE($4, description),
             notes       = COALESCE($5, notes),
             updated_at  = NOW()
       WHERE tenant_id = $1
         AND id = $2
         AND deleted_at IS NULL
       RETURNING *
      `,
      [
        tenantId,
        id,
        body.name,
        body.description,
        body.notes,
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
