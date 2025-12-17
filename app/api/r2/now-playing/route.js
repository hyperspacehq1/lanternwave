import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/server";

export const runtime = "nodejs";

// ------------------------------------------------------------
// GET now playing
// ------------------------------------------------------------
export async function GET() {
  try {
    const { tenantId } = getTenantContext();

    if (!tenantId) {
      throw new Error("Tenant context missing");
    }

    const { rows } = await db.query(
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
    console.error("[now-playing GET]", err);
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
    const { tenantId, prefix } = getTenantContext();

    if (!tenantId || !prefix) {
      throw new Error("Tenant context missing");
    }

    const body = await req.json();
    const key = body?.key || null;

    // STOP (clear now playing)
    if (key === null) {
      await db.query(
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

    // Enforce tenant isolation
    if (!key.startsWith(prefix + "/")) {
      return NextResponse.json(
        { ok: false, error: "invalid tenant key" },
        { status: 403 }
      );
    }

    // Ensure clip exists and is not deleted
    const { rowCount } = await db.query(
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
    await db.query(
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
    console.error("[now-playing POST]", err);
    return NextResponse.json(
      { ok: false, error: "failed to set now playing" },
      { status: 500 }
    );
  }
}
