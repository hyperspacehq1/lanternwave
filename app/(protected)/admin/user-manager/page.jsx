import { NextResponse } from "next/server";
import { query } from "@/lib/db/db";

/**
 * GET /api/admin/user-manager
 *
 * Returns all users with:
 *   - username, email, tenant_id, user_id
 *   - ai_usage_count  (from tenant_ai_usage)
 *   - is_online        (active session in user_sessions)
 */
export async function GET() {
  try {
    const result = await query(`
      SELECT
        u.id        AS user_id,
        u.username,
        u.email,
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
      ORDER BY u.username ASC
    `);

    return NextResponse.json({ ok: true, users: result.rows });
  } catch (err) {
    console.error("User list fetch failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/user-manager
 *
 * Expects JSON body: { user_id, tenant_id }
 *
 * Deletes associated rows across all related tables, then
 * removes the tenant and user records themselves.
 *
 * NOTE: If your FK constraints use ON DELETE CASCADE this will
 * happen automatically — but we do explicit deletes here for
 * safety in case cascades are not configured.
 */
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { user_id, tenant_id } = body;

    if (!user_id || !tenant_id) {
      return NextResponse.json(
        { ok: false, error: "user_id and tenant_id are required" },
        { status: 400 }
      );
    }

    // Delete in dependency order (children first)
    await query(`DELETE FROM tenant_ai_usage WHERE tenant_id = $1`, [
      tenant_id,
    ]);
    await query(`DELETE FROM user_sessions WHERE user_id = $1`, [user_id]);
    await query(
      `DELETE FROM tenant_users WHERE user_id = $1 AND tenant_id = $2`,
      [user_id, tenant_id]
    );
    await query(`DELETE FROM users WHERE id = $1`, [user_id]);
    await query(`DELETE FROM tenants WHERE id = $1`, [tenant_id]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("User delete failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to delete user" },
      { status: 500 }
    );
  }
}