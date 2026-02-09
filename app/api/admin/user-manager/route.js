import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/user-manager
 */
export async function GET() {
  console.log("[user-manager] GET /api/admin/user-manager called");
  try {
    console.log("[user-manager] Running users query...");
    const result = await query(`
      SELECT
        u.id        AS user_id,
        u.username,
        u.email,
        u.is_admin,
        u.created_at,
        tu.tenant_id,
        COALESCE(ai.usage_count, 0)::int AS ai_usage_count,
        CASE
          WHEN s.user_id IS NOT NULL THEN true
          ELSE false
        END AS is_online
      FROM users u
      LEFT JOIN tenant_users tu ON tu.user_id = u.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int AS usage_count
        FROM tenant_ai_usage
        GROUP BY tenant_id
      ) ai ON ai.tenant_id = tu.tenant_id
      LEFT JOIN (
        SELECT DISTINCT user_id
        FROM user_sessions
        WHERE expires_at > NOW()
      ) s ON s.user_id = u.id
      WHERE u.deleted_at IS NULL
      ORDER BY u.username ASC
    `);

    console.log("[user-manager] Query returned", result.rows.length, "users");
    return NextResponse.json({ ok: true, users: result.rows });
  } catch (err) {
    console.error("[user-manager] GET failed:", err.message, err.stack);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/user-manager
 * Body: { user_id, tenant_id }
 */
export async function DELETE(request) {
  console.log("[user-manager] DELETE called");
  try {
    const body = await request.json();
    const { user_id, tenant_id } = body;
    console.log("[user-manager] Deleting user:", user_id, "tenant:", tenant_id);

    if (!user_id || !tenant_id) {
      return NextResponse.json(
        { ok: false, error: "user_id and tenant_id are required" },
        { status: 400 }
      );
    }

    await query(`DELETE FROM tenant_ai_usage WHERE tenant_id = $1`, [tenant_id]);
    console.log("[user-manager] Deleted tenant_ai_usage");

    await query(`DELETE FROM user_sessions WHERE user_id = $1`, [user_id]);
    console.log("[user-manager] Deleted user_sessions");

    await query(`DELETE FROM tenant_users WHERE user_id = $1 AND tenant_id = $2`, [user_id, tenant_id]);
    console.log("[user-manager] Deleted tenant_users");

    await query(`UPDATE users SET deleted_at = NOW() WHERE id = $1`, [user_id]);
    console.log("[user-manager] Soft-deleted user");

    await query(`UPDATE tenants SET deleted_at = NOW() WHERE id = $1`, [tenant_id]);
    console.log("[user-manager] Soft-deleted tenant");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[user-manager] DELETE failed:", err.message, err.stack);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
