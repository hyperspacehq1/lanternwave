import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -----------------------------------------------------------
   GET /api/admin/json-export/history
   Returns the list of recent exports
------------------------------------------------------------ */
export async function GET(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows } = await query(
      `SELECT tenant_id, campaign_id, unique_id, filename, created_at
       FROM export_history
       ORDER BY created_at DESC
       LIMIT 50`,
      []
    );

    return Response.json({
      ok: true,
      exports: rows.map(row => ({
        ...row,
        tenant_id: row.tenant_id?.toString(),
        campaign_id: row.campaign_id?.toString(),
      })),
    });
  } catch (e) {
    console.error("History error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
