import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";

function pick(body, camel, snake) {
  return body[camel] ?? body[snake] ?? null;
}

export async function PUT(req, { params }) {
  const { tenantId } = await getTenantContext(req);
  const id = params.id;
  const body = await req.json();

  const result = await query(
    `
    UPDATE npcs
       SET name              = COALESCE($3, name),
           npc_type          = COALESCE($4, npc_type),
           description       = COALESCE($5, description),
           goals             = COALESCE($6, goals),
           faction_alignment = COALESCE($7, faction_alignment),
           secrets           = COALESCE($8, secrets),
           notes             = COALESCE($9, notes),
           updated_at        = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [
      tenantId,
      id,
      pick(body, "name", "name"),
      pick(body, "npcType", "npc_type"),
      pick(body, "description", "description"),
      pick(body, "goals", "goals"),
      pick(body, "factionAlignment", "faction_alignment"),
      pick(body, "secrets", "secrets"),
      pick(body, "notes", "notes"),
    ]
  );

  return Response.json(result.rows[0] || null);
}
