import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ---- helpers (local, explicit, reliable) ----
function getHeader(req, name) {
  const h = req?.headers;
  if (!h) return null;

  const key = name.toLowerCase();

  if (typeof h.get === "function") {
    return h.get(key);
  }

  if (typeof h === "object") {
    return h[key] ?? h[name] ?? null;
  }

  return null;
}

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;

  cookieHeader.split(";").forEach((part) => {
    const s = part.trim();
    if (!s) return;
    const idx = s.indexOf("=");
    if (idx === -1) return;
    const k = s.slice(0, idx);
    const v = s.slice(idx + 1);
    out[k] = decodeURIComponent(v);
  });

  return out;
}

async function resolveTenantFromRequest(req) {
  const cookieHeader = getHeader(req, "cookie") || "";
  const cookies = parseCookies(cookieHeader);
  const lwSession = cookies["lw_session"];

  // Not logged in → anonymous-safe
  if (!lwSession) {
    return { tenantId: null };
  }

  // lw_session === user_id
  const userId = lwSession;

  const tenantRes = await query(
    `
    select tenant_id
    from tenant_users
    where user_id = $1
    order by created_at asc
    limit 1
    `,
    [userId]
  );

  return {
    tenantId: tenantRes.rows[0]?.tenant_id || null,
  };
}

// ---- route ----
export async function GET(req) {
  try {
    const { tenantId } = await resolveTenantFromRequest(req);

    // Initial render / not logged in → empty list (EXPECTED)
    if (!tenantId) {
      return NextResponse.json({ ok: true, rows: [] });
    }

    const result = await query(
      `
      select
        id,
        title,
        object_key,
        mime_type,
        byte_size,
        duration_ms,
        created_at
      from clips
      where tenant_id = $1
        and deleted_at is null
      order by created_at desc
      `,
      [tenantId]
    );

    return NextResponse.json({
      ok: true,
      rows: result.rows,
    });
  } catch (err) {
    console.error("[r2/list GET] real error", err);
    return NextResponse.json(
      { ok: false, error: "failed to list clips" },
      { status: 500 }
    );
  }
}
