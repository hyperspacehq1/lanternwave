import { NextResponse } from "next/server";
import { db } from "@/lib/db";                     // ✔ Drizzle instance
import { sessions } from "@/lib/db/schema";       // ✔ Your sessions table
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

/* -----------------------------------------------------------
   GET /api/sessions?id= OR ?campaign_id=
------------------------------------------------------------ */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const campaignId = searchParams.get("campaign_id");

    if (id) {
      const result = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, id))
        .limit(1);

      if (result.length === 0)
        return NextResponse.json({ error: "Session not found" }, { status: 404 });

      return NextResponse.json(result[0]);
    }

    if (campaignId) {
      const result = await db
        .select()
        .from(sessions)
        .where(eq(sessions.campaign_id, campaignId))
        .orderBy(sessions.created_at);

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Either id or campaign_id is required" },
      { status: 400 }
    );
  } catch (err) {
    console.error("GET /sessions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   POST /api/sessions
------------------------------------------------------------ */
export async function POST(req) {
  try {
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const { campaign_id, description, geography, notes, history } =
      await req.json();

    if (!campaign_id)
      return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });

    const inserted = await db
      .insert(sessions)
      .values({
        campaign_id,
        description,
        geography: geography || "",
        notes: notes || "",
        history: history || "",
      })
      .returning();

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (err) {
    console.error("POST /sessions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   PUT /api/sessions?id=
------------------------------------------------------------ */
export async function PUT(req) {
  try {
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { description, geography, notes, history } = await req.json();

    const updated = await db
      .update(sessions)
      .set({
        description,
        geography,
        notes,
        history,
        updated_at: new Date(),
      })
      .where(eq(sessions.id, id))
      .returning();

    if (updated.length === 0)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    return NextResponse.json(updated[0]);
  } catch (err) {
    console.error("PUT /sessions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   DELETE /api/sessions?id=
------------------------------------------------------------ */
export async function DELETE(req) {
  try {
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const deleted = await db
      .delete(sessions)
      .where(eq(sessions.id, id))
      .returning({ id: sessions.id });

    if (deleted.length === 0)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("DELETE /sessions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
