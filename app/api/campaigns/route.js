/* -----------------------------------------------------------
   POST /api/campaigns
------------------------------------------------------------ */
import { randomUUID } from "crypto";

export async function POST(req) {
  try {
    const headers = Object.fromEntries(req.headers.entries());
    const auth = requireAdmin(headers);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const {
      name,
      description,
      world_setting,
      campaign_date
    } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // NEW: generate uuid for campaigns.id
    const id = randomUUID();

    const result = await query(
      `
      INSERT INTO campaigns
        (id, name, description, world_setting, campaign_date, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
      `,
      [
        id,
        name,
        description || "",
        world_setting || "",
        campaign_date || null
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });

  } catch (err) {
    console.error("POST /campaigns error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
