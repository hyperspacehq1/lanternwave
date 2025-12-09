// app/api/conditions/[id]/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conditions } from "@/lib/db/schema";
import { authAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PUT(req, { params }) {
  try {
    const auth = await authAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;
    const body = await req.json();

    const updateData = {
      targetId: body.targetId,
      targetType: body.targetType,
      condition: body.condition,
      severity: body.severity ?? null,
      duration: body.duration ?? null,
      notes: body.notes ?? null,
    };

    const [updated] = await db
      .update(conditions)
      .set(updateData)
      .where(eq(conditions.id, id))
      .returning("*");

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/conditions error:", err);
    return NextResponse.json({ error: "Failed to update condition" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await authAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;

    await db.delete(conditions).where(eq(conditions.id, id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/conditions error:", err);
    return NextResponse.json({ error: "Failed to delete condition" }, { status: 500 });
  }
}
