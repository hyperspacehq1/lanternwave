import { query } from "@/lib/db";
import { sanitizeRows } from "@/lib/api/sanitize";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------
   GET ?session_id=
-------------------------------- */
export async function GET(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch (err) {
    console.error("getTenantContext failed (GET encounters)", err);
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) return Response.json([]);

  const { rows } = await query(
    `
    SELECT se.id,
           se.encounter_id,
           e.name,
           e.description,
           e.encounter_type,
           e.difficulty
      FROM session_encounters se
      JOIN encounters e ON e.id = se.encounter_id AND e.deleted_at IS NULL
      JOIN sessions s ON s.id = se.session_id AND s.tenant_id = $1
     WHERE se.session_id = $2
       AND se.deleted_at IS NULL
     ORDER BY se.created_at
    `,
    [ctx.tenantId, sessionId]
  );

  return Response.json(
    sanitizeRows(rows, {
      name: 120,
      description: 10000,
      encounter_type: 50,
      difficulty: 20,
    })
  );
}

/* -------------------------------
   POST ?session_id=
-------------------------------- */
export async function POST(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch (err) {
    console.error("getTenantContext failed (POST encounters)", err);
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  const { encounter_id } = await req.json();

  if (!sessionId || !encounter_id) {
    return Response.json(
      { error: "session_id and encounter_id required" },
      { status: 400 }
    );
  }

  await query(
    `
    INSERT INTO session_encounters (tenant_id, session_id, encounter_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (tenant_id, session_id, encounter_id) DO NOTHING
    `,
    [ctx.tenantId, sessionId, encounter_id]
  );

  return Response.json({ ok: true });
}

/* -------------------------------
   DELETE ?session_id=
-------------------------------- */
export async function DELETE(req) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch (err) {
    console.error("getTenantContext failed (DELETE encounters)", err);
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  const { encounter_id } = await req.json();

  if (!sessionId || !encounter_id) {
    return Response.json(
      { error: "session_id and encounter_id required" },
      { status: 400 }
    );
  }

  await query(
    `
    UPDATE session_encounters
       SET deleted_at = now()
     WHERE tenant_id = $1
       AND session_id = $2
       AND encounter_id = $3
       AND deleted_at IS NULL
    `,
    [ctx.tenantId, sessionId, encounter_id]
  );

  return Response.json({ ok: true });
}
