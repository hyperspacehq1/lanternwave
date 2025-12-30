import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ------------------------------------------------------------
// GET now playing
// ------------------------------------------------------------
export async function GET(req) {
  try {
    const { tenantId } = await getTenantContext(req, {
      allowAnonymous: true,
    });

    // Anonymous / initial render → not an error
    if (!tenantId) {
      return NextResponse.json({
        ok: true,
        nowPlaying: null,
      });
    }

    const { rows } = await query(
      `
      select object_key, updated_at
      from now_playing
      where tenant_id = $1
      limit 1
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
// SET / CLEAR now playing
// ------------------------------------------------------------
export async function POST(req) {
  try {
    const { tenantId } = await getTenantContext(req);

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
        delete from now_playing
        where tenant_id = $1
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
      select 1
      from clips
      where tenant_id = $1
        and object_key = $2
        and deleted_at is null
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
      insert into now_playing (tenant_id, object_key)
      values ($1, $2)
      on conflict (tenant_id)
      do update set
        object_key = excluded.object_key,
        updated_at = now()
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
