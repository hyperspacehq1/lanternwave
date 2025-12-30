
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  throw new Error("sessions route disabled for isolation");
}

export async function POST() {
  throw new Error("sessions route disabled for isolation");
}

export async function PUT() {
  throw new Error("sessions route disabled for isolation");
}

export async function DELETE() {
  throw new Error("sessions route disabled for isolation");
}
