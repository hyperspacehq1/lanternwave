// app/api/r2/now-playing/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { nowPlaying } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { inferMediaType } from "@/lib/r2/contentType";

const SINGLETON_ID = 1;

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(nowPlaying)
      .where(eq(nowPlaying.id, SINGLETON_ID));

    const row = rows[0] || null;
    return NextResponse.json({ ok: true, nowPlaying: row });
  } catch (err) {
    console.error("now-playing GET error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch now playing" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const key = body?.key ?? null;

    const type = key ? inferMediaType(key) : null;
    const updatedAt = new Date();

    // Upsert singleton row
    await db
      .insert(nowPlaying)
      .values({
        id: SINGLETON_ID,
        key,
        type,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: nowPlaying.id,
        set: { key, type, updatedAt },
      });

    return NextResponse.json({
      ok: true,
      nowPlaying: { id: SINGLETON_ID, key, type, updatedAt },
    });
  } catch (err) {
    console.error("now-playing POST error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to set now playing" },
      { status: 500 }
    );
  }
}
