import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fromDb, toDb } from "@/lib/campaignMapper";

export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   Helper: resolve + enforce tenant
------------------------------------------------------------ */
async function requireTenant(req) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing tenant context" },
        { status: 401 }
      ),
    };
  }

  // Enforce RLS (must be a real query string)
  await query(
    `SET LOCAL app.tenant_id = $1`,
    [tenantId]
  );

  return { ok: true };
}

/* -----------------------------------------------------------
   GET /api/campaigns/:id
------------------------------------------------------------ */
export async function GET(req, { params }) {
  try {
    const tenant = await requireTenant(req);
    if (!tenant.ok) return tenant.response;

    const { id } = params;

    const result = await query(
      `
      SELECT *
      FROM campaigns
      WHERE tenant_id = app_tenant_id()
        AND id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    if (!result.rows.length) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(fromDb(result.rows[0]), { status: 200 });
  } catch (err) {
    console.error(
      `GET /api/campaigns/${params?.id} error:`,
      err
    );
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   PUT /api/campaigns/:id
------------------------------------------------------------ */
export async function PUT(req, { params }) {
  try {
    const tenant = await requireTenant(req);
    if (!tenant.ok) return tenant.response;

    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { id } = params;
    const incoming = await req.json();
    const dbVals = toDb(incoming);

    const sets = [];
    const values = [];

    if (incoming.name !== undefined) {
      sets.push(`name = $${sets.length + 1}`);
      values.push(dbVals.name);
    }

    if (incoming.description !== undefined) {
      sets.push(`description = $${sets.length + 1}`);
      values.push(dbVals.description);
    }

    if (incoming.worldSetting !== undefined) {
      sets.push(`world_setting = $${sets.length + 1}`);
      values.push(dbVals.world_setting);
    }

    if (incoming.campaignDate !== undefined) {
      sets.push(`campaign_date = $${sets.length + 1}`);
      values.push(dbVals.campaign_date);
    }

    if (!sets.length) {
      return NextResponse.json(
        { error: "No valid fields provided to update" },
        { status: 400 }
      );
    }

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `
      UPDATE campaigns
      SET ${sets.join(", ")}
      WHERE tenant_id = app_tenant_id()
        AND id = $${values.length}
        AND deleted_at IS NULL
      RETURNING *
      `,
      values
    );

    if (!result.rows.length) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(fromDb(result.rows[0]), { status: 200 });
  } catch (err) {
    console.error(
      `PUT /api/campaigns/${params?.id} error:`,
      err
    );
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   DELETE /api/campaigns/:id
   (soft delete)
------------------------------------------------------------ */
export async function DELETE(req, { params }) {
  try {
    const tenant = await requireTenant(req);
    if (!tenant.ok) return tenant.response;

    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { id } = params;

    const result = await query(
      `
      UPDATE campaigns
      SET deleted_at = NOW()
      WHERE tenant_id = app_tenant_id()
        AND id = $1
        AND deleted_at IS NULL
      RETURNING id
      `,
      [id]
    );

    if (!result.rows.length) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, id },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      `DELETE /api/campaigns/${params?.id} error:`,
      err
    );
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
