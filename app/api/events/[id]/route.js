import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  let ctx;
  try {
    ctx = await getTenantContext(req);
  } catch (err) {
    console.error("AUTH ERROR", err);
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 🔍 STEP 1: log raw params
  console.error("🔎 RAW PARAMS", params);

  const sessionId = params?.id;
  const body = await req.json();
  const event_id = body?.event_id;

  // 🔍 STEP 2: log resolved values
  console.error("🔎 RESOLVED VALUES", {
    tenantId: ctx?.tenantId,
    sessionId,
    event_id,
    sessionIdType: typeof sessionId,
    sessionIdLength: sessionId?.length,
  });

  // 🔥 STEP 3: hard stop if sessionId is falsy
  if (!sessionId) {
    return Response.json(
      {
        error: "sessionId is falsy before DB insert",
        debug: { params, sessionId },
      },
      { status: 500 }
    );
  }

  if (!event_id) {
    return Response.json(
      { error: "event_id required", debug: body },
      { status: 400 }
    );
  }

  try {
    // 🔍 STEP 4: force Postgres to echo inputs
    const { rows } = await query(
      `
      INSERT INTO session_events (
        tenant_id,
        session_id,
        event_id
      )
      VALUES ($1, $2::uuid, $3::uuid)
      RETURNING
        tenant_id,
        session_id,
        event_id
      `,
      [ctx.tenantId, sessionId, event_id]
    );

    console.error("✅ INSERT RESULT", rows[0]);

    return Response.json({ ok: true, row: rows[0] });
  } catch (err) {
    console.error("❌ INSERT FAILED", {
      message: err.message,
      code: err.code,
      detail: err.detail,
    });

    return Response.json(
      {
        error: "DB insert failed",
        db: {
          message: err.message,
          code: err.code,
          detail: err.detail,
        },
      },
      { status: 500 }
    );
  }
}
