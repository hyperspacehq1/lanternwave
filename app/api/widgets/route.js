// app/api/widgets/route.js
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";

export async function GET(req) {
  const { user } = await getTenantContext(req);

  const rows = await query(
    `SELECT widget_key, enabled FROM user_widgets WHERE user_id = $1`,
    [user.id]
  );

  const result = {};
  for (const row of rows) {
    result[row.widget_key] = row.enabled;
  }

  return Response.json(result);
}

export async function POST(req) {
  const { user } = await getTenantContext(req);
  const { key, enabled } = await req.json();

  await query(
    `
    INSERT INTO user_widgets (user_id, widget_key, enabled)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, widget_key)
    DO UPDATE SET enabled = EXCLUDED.enabled
    `,
    [user.id, key, enabled]
  );

  return Response.json({ ok: true });
}
