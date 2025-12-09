// app/api/conditions/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conditions } from "@/lib/db/schema";
import { authAdmin, ADMIN_HEADER_KEY } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const rows = await db.select().from(conditions);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/conditions error:", err);
    return NextResponse.json({ error: "Failed to load conditions" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    // Admin auth
    const auth = await authAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const data = {
      id: body.id || uuidv4(),
      targetId: body.targetId,
      targetType: body.targetType, // "pc" or "npc"
      condition: body.condition,
      severity: body.severity || null,
      duration: body.duration || null,
      notes: body.notes || null,
    };

    const [inserted] = await db.insert(conditions).values(data).returning("*");

    return NextResponse.json(inserted);
  } catch (err) {
    console.error("POST /api/conditions error:", err);
    return NextResponse.json({ error: "Failed to create condition" }, { status: 500 });
  }
}
