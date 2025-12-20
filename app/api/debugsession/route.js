import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { tenantId } = await getTenantContext(req);
    const body = await req.json();

    if (!body?.campaign_id) {
      return Response.json(
        { error: "campaign_id required" },
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

    // INSERT session (NO geography column)
    const { rows } = await query(
      `
      INSERT INTO sessions (
        tenant_id,
        campaign_id,
        description,
        notes,
        history
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        tenantId,
        body.campaign_id,
        body.description ?? null,
        body.notes ?? null,
        body.history ?? null,
      ]
    );

    return Response.json(rows[0], { status: 201 });
  } catch (err) {
    console.error("DEBUGSESSION POST FAILED", err);
    return Response.json(
      {
        error: "debugsession failed",
        detail: String(err),
      },
      { status: 500 }
    );
  }
}
