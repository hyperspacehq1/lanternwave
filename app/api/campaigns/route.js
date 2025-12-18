export const dynamic = "force-dynamic";

/* ---------------- GET ---------------- */
export async function GET(req) {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "GET /api/campaigns works",
    }),
    { status: 200 }
  );
}

/* ---------------- POST ---------------- */
export async function POST(req) {
  const body = await req.json();

  return new Response(
    JSON.stringify({
      ok: true,
      message: "POST /api/campaigns works",
      body,
    }),
    { status: 201 }
  );
}
