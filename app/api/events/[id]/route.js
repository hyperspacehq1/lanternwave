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

  const sessionId = params?.id;
  const { event_id } = await req.json();

  console.log("SESSION EVENTS POST INPUT", {
    tenantId: ctx?.tenantId,
    sessionId,
    event_id,
  });

  if (!event_id) {
    return Response.json({ error: "event_id required" }, { status: 400 });
  }

  try {
    const { rows } = await query(
      `
      INSERT INTO session_events (
        tenant_id,
        session_id,
        event_id
      )
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [ctx.tenantId, sessionId, event_id]
    );

    console.log("SESSION EVENTS INSERTED ROW", rows[0]);

    return Response.json({ ok: true, row: rows[0] });
  } catch (err) {
    console.error("SESSION EVENTS INSERT FAILED", {
      message: err.message,
      detail: err.detail,
      constraint: err.constraint,
      code: err.code,
    });

    return Response.json(
      {
        error: "DB insert failed",
        db: {
          message: err.message,
          detail: err.detail,
          constraint: err.constraint,
          code: err.code,
        },
      },
      { status: 500 }
    );
  }
}
