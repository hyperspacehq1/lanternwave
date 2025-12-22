import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */
function pick(body, camel, snake) {
  return body[camel] ?? body[snake] ?? null;
}

function normalizeSensory(input) {
  if (input == null || input === "") return null;

  // Already structured (AI or future UI)
  if (typeof input === "object") return input;

  // Attempt JSON parse (power users / future editor)
  try {
    const parsed = JSON.parse(input);
    if (typeof parsed === "object") return parsed;
  } catch {}

  // Human free-text fallback
  return {
    text: String(input).trim(),
    source: "human",
    updated_at: new Date().toISOString(),
  };
}

/* -------------------------------------------------
   PUT /api/locations/:id
-------------------------------------------------- */
export async function PUT(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const id = params.id;
  const body = await req.json();

  const result = await query(
    `
    UPDATE locations
       SET name            = COALESCE($3, name),
           description     = COALESCE($4, description),
           notes           = COALESCE($5, notes),
           sensory         = COALESCE($6, sensory),
           world           = COALESCE($7, world),
           address_street  = COALESCE($8, address_street),
           address_city    = COALESCE($9, address_city),
           address_state   = COALESCE($10, address_state),
           address_zip     = COALESCE($11, address_zip),
           address_country = COALESCE($12, address_country),
           updated_at      = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [
      tenantId,
      id,
      pick(body, "name", "name"),
      pick(body, "description", "description"),
      pick(body, "notes", "notes"),
      normalizeSensory(pick(body, "sensory", "sensory")),
      pick(body, "world", "world"),
      pick(body, "addressStreet", "address_street"),
      pick(body, "addressCity", "address_city"),
      pick(body, "addressState", "address_state"),
      pick(body, "addressZip", "address_zip"),
      pick(body, "addressCountry", "address_country"),
    ]
  );

  return Response.json(result.rows[0] || null);
}
