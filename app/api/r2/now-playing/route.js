import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ------------------------------------------------------------
// GET now playing (anonymous-safe)
// ------------------------------------------------------------
export async function GET(req) {
  try {
    // Optional auth: if no session, treat as anonymous initial render
    const session = await requireAuth({ allowAnonymous: true });
    const tenantId = session?.tenant_id ?? null;

    if (!tenantId) {
      return NextResponse.json({
        ok: true,
        nowPlaying: null,
      });
    }

    const { rows } = await query(
      `
      SELECT object_key, updated_at
        FROM now_playing
       WHERE tenant_id = $1
       LIMIT 1
      `,
      [tenantId]
    );

    if (!rows[0]?.object_key) {
      return NextResponse.json({
        ok: true,
        nowPlaying: null,
      });
    }

    return NextResponse.json({
      ok: true,
      nowPlaying: {
        key: rows[0].object_key,
        updatedAt: rows[0].updated_at,
      },
    });
  } catch (err) {
    console.error("[now-playing GET] real error", err);
    return NextResponse.json(
      { ok: false, error: "failed to read now playing" },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// SET / CLEAR now playing (auth required)
// ------------------------------------------------------------
export async function POST(req) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const tenantId = session.tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const key = body?.key ?? null;

    // CLEAR now playing
    if (key === null) {
      await query(
        `
        DELETE FROM now_playing
         WHERE tenant_id = $1
        `,
        [tenantId]
      );

      return NextResponse.json({
        ok: true,
        nowPlaying: null,
      });
    }

    // Ensure clip exists and belongs to tenant
    const { rowCount } = await query(
      `
      SELECT 1
        FROM clips
       WHERE tenant_id = $1
         AND object_key = $2
         AND deleted_at IS NULL
      `,
      [tenantId, key]
    );

    if (rowCount === 0) {
      return NextResponse.json(
        { ok: false, error: "clip not found" },
        { status: 404 }
      );
    }

    // Upsert now playing
    await query(
      `
      INSERT INTO now_playing (tenant_id, object_key)
      VALUES ($1, $2)
      ON CONFLICT (tenant_id)
      DO UPDATE SET
        object_key = EXCLUDED.object_key,
        updated_at = NOW()
      `,
      [tenantId, key]
    );

    return NextResponse.json({
      ok: true,
      nowPlaying: {
        key,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[now-playing POST] real error", err);
    return NextResponse.json(
      { ok: false, error: "failed to set now playing" },
      { status: 500 }
    );
  }
}
