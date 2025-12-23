import { sanitizeRow, sanitizeRows } from "@/lib/api/sanitize";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";
import { fromDb } from "@/lib/campaignMapper";

export const dynamic = "force-dynamic";

const ALLOWED_CAMPAIGN_PACKAGES = new Set([
  "standard",
  "starter",
  "advanced",
  "premium",
]);

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function pick(body, camel, snake) {
  if (hasOwn(body, camel)) return body[camel];
  if (hasOwn(body, snake)) return body[snake];
  return undefined;
}

function normalizeDateOnly(value) {
  // For Postgres DATE column. Accept YYYY-MM-DD or ISO, return YYYY-MM-DD.
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const s = String(value).trim();
  if (!s) return null;

  // If ISO string, take date portion
  const datePart = s.includes("T") ? s.split("T")[0] : s;

  // Require YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return { _invalidDate: true, raw: s };
  }
  return datePart;
}

/* -------------------------------------------------
   GET /api/campaigns
-------------------------------------------------- */
export async function GET(req) {
  let tenantId;
  try {
    ({ tenantId } = await getTenantContext(req));
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rows } = await query(
    `
    SELECT *
      FROM campaigns
     WHERE tenant_id = $1
       AND deleted_at IS NULL
     ORDER BY created_at DESC
    `,
    [tenantId]
  );

  return Response.json(
    sanitizeRows(rows.map(fromDb), {
      name: 120,
      description: 10000,
      worldSetting: 10000,
      campaignDate: 50,
      campaignPackage: 50,
    })
  );
}

/* -------------------------------------------------
   POST /api/campaigns
-------------------------------------------------- */
export async function POST(req) {
  let tenantId;
  try {
    ({ tenantId } = await getTenantContext(req));
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const name =
    typeof body?.name === "string" && body.name.trim()
      ? body.name.trim()
      : "New Campaign";

  const campaignPackage =
    pick(body, "campaignPackage", "campaign_package") ?? "standard";

  if (!ALLOWED_CAMPAIGN_PACKAGES.has(campaignPackage)) {
    return Response.json({ error: "Invalid campaign package" }, { status: 400 });
  }

  const worldSetting = pick(body, "worldSetting", "world_setting") ?? null;
  const campaignDateRaw = pick(body, "campaignDate", "campaign_date");
  const normalizedDate = normalizeDateOnly(campaignDateRaw);
  if (normalizedDate && normalizedDate._invalidDate) {
    return Response.json(
      { error: "Invalid campaignDate (expected YYYY-MM-DD)", received: normalizedDate.raw },
      { status: 400 }
    );
  }

  const { rows } = await query(
    `
    INSERT INTO campaigns (
      tenant_id,
      name,
      description,
      world_setting,
      campaign_date,
      campaign_package
    )
    VALUES ($1, $2, $3, $4, $5::date, $6)
    RETURNING *
    `,
    [
      tenantId,
      name,
      body?.description ?? null,
      worldSetting,
      normalizedDate ?? null,
      campaignPackage,
    ]
  );

  return Response.json(
    sanitizeRow(fromDb(rows[0]), {
      name: 120,
      description: 10000,
      worldSetting: 10000,
      campaignDate: 50,
      campaignPackage: 50,
    }),
    { status: 201 }
  );
}

/* -------------------------------------------------
   PUT /api/campaigns?id=   ✅ OPTION A + FAIL-LOUD
-------------------------------------------------- */
export async function PUT(req) {
  let tenantId;
  try {
    ({ tenantId } = await getTenantContext(req));
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return Response.json(
      { error: "Invalid JSON body", detail: String(e?.message || e) },
      { status: 400 }
    );
  }

  // Validate only if field is present
  if (hasOwn(body, "name")) {
    if (!body.name || !String(body.name).trim()) {
      return Response.json({ error: "Campaign name cannot be blank" }, { status: 400 });
    }
  }

  const pkg = pick(body, "campaignPackage", "campaign_package");
  if (pkg !== undefined && !ALLOWED_CAMPAIGN_PACKAGES.has(pkg)) {
    return Response.json({ error: "Invalid campaign package" }, { status: 400 });
  }

  const dateRaw = pick(body, "campaignDate", "campaign_date");
  const normalizedDate = normalizeDateOnly(dateRaw);
  if (normalizedDate && normalizedDate._invalidDate) {
    return Response.json(
      { error: "Invalid campaignDate (expected YYYY-MM-DD)", received: normalizedDate.raw },
      { status: 400 }
    );
  }

  // TRUE PATCH: only update columns for keys actually present in body
  const sets = [];
  const values = [tenantId, id];
  let i = 3;

  if (hasOwn(body, "name")) {
    sets.push(`name = $${i++}`);
    values.push(String(body.name).trim());
  }

  if (hasOwn(body, "description")) {
    sets.push(`description = $${i++}`);
    values.push(body.description ?? null);
  }

  const worldSetting = pick(body, "worldSetting", "world_setting");
  if (worldSetting !== undefined) {
    sets.push(`world_setting = $${i++}`);
    values.push(worldSetting ?? null);
  }

  if (dateRaw !== undefined) {
    sets.push(`campaign_date = $${i++}::date`);
    values.push(normalizedDate ?? null);
  }

  if (pkg !== undefined) {
    sets.push(`campaign_package = $${i++}`);
    values.push(pkg);
  }

  if (!sets.length) {
    return Response.json({ error: "No valid fields provided" }, { status: 400 });
  }

  try {
    const { rows } = await query(
      `
      UPDATE campaigns
         SET ${sets.join(", ")},
             updated_at = NOW()
       WHERE tenant_id = $1
         AND id = $2
         AND deleted_at IS NULL
       RETURNING *
      `,
      values
    );

    if (!rows.length) {
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }

    return Response.json(
      sanitizeRow(fromDb(rows[0]), {
        name: 120,
        description: 10000,
        worldSetting: 10000,
        campaignDate: 50,
        campaignPackage: 50,
      })
    );
  } catch (err) {
    // STOP GUESSING: surface the real Postgres error in Network tab response
    return Response.json(
      {
        error: "POSTGRES_ERROR",
        message: err?.message ?? String(err),
        code: err?.code,
        detail: err?.detail,
        hint: err?.hint,
        where: err?.where,
        constraint: err?.constraint,
        // Extra context (safe + helpful)
        meta: {
          route: "/api/campaigns",
          id,
          updatedColumns: sets.map((s) => s.split("=")[0].trim()),
          bodyKeys: body && typeof body === "object" ? Object.keys(body) : [],
        },
      },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------
   DELETE /api/campaigns?id=
-------------------------------------------------- */
export async function DELETE(req) {
  let tenantId;
  try {
    ({ tenantId } = await getTenantContext(req));
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await query(
    `
    UPDATE campaigns
       SET deleted_at = NOW(),
           updated_at = NOW()
     WHERE tenant_id = $1
       AND id = $2
       AND deleted_at IS NULL
     RETURNING *
    `,
    [tenantId, id]
  );

  return Response.json(
    rows[0]
      ? sanitizeRow(fromDb(rows[0]), {
          name: 120,
          description: 10000,
          worldSetting: 10000,
          campaignDate: 50,
          campaignPackage: 50,
        })
      : null
  );
}
