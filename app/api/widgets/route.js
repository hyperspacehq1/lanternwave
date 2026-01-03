import { NextResponse } from "next/server";

/* -------------------------------------------------
   GET /api/widgets
   Page-scoped widgets (no persistence yet)
-------------------------------------------------- */
export async function GET() {
  // Widgets are page-scoped UI only.
  // No DB persistence by design.
  return NextResponse.json([]);
}

/* -------------------------------------------------
   POST /api/widgets
   No-op (reserved for future persistence)
-------------------------------------------------- */
export async function POST() {
  return NextResponse.json({ success: true });
}

/* -------------------------------------------------
   DELETE /api/widgets
   No-op (reserved for future persistence)
-------------------------------------------------- */
export async function DELETE() {
  return NextResponse.json({ success: true });
}
