// netlify/functions/api-campaigns.js
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

// Helper for JSON responses
const json = (status, payload) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

/* -----------------------------------------------------------
   GET /api-campaigns
   Supports:
   - /api-campaigns                (all campaigns)
   - /api-campaigns?id=UUID       (single campaign)
------------------------------------------------------------ */
async function handleGET(event) {
  const id = event.queryStringParameters?.id;

  // Single campaign
  if (id) {
    const result = await query(
      `SELECT *
       FROM campaigns
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return json(404, { error: "Campaign not found" });
    }

    return json(200, result.rows[0]);
  }

  // All campaigns
  const result = await query(
    `SELECT *
     FROM campaigns
     ORDER BY created_at DESC`
  );

  return json(200, result.rows);
}

/* -----------------------------------------------------------
   POST /api-campaigns
------------------------------------------------------------ */
async function handlePOST(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const body = JSON.parse(event.body || "{}");

  const {
    name,
    description,
    world_setting,
    campaign_date
  } = body;

  if (!name) {
    return json(400, { error: "name is required" });
  }

  const result = await query(
    `
    INSERT INTO campaigns
      (name, description, world_setting, campaign_date, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING *
    `,
    [name, description || "", world_setting || "", campaign_date || null]
  );

  return json(201, result.rows[0]);
}

/* -----------------------------------------------------------
   PUT /api-campaigns?id=UUID
------------------------------------------------------------ */
async function handlePUT(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const id = event.queryStringParameters?.id;
  if (!id) return json(400, { error: "id is required" });

  const body = JSON.parse(event.body || "{}");

  const {
    name,
    description,
    world_setting,
    campaign_date
  } = body;

  const result = await query(
    `
    UPDATE campaigns
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           world_setting = COALESCE($4, world_setting),
           campaign_date = COALESCE($5, campaign_date),
           updated_at = NOW()
     WHERE id = $1
     RETURNING *
    `,
    [id, name, description, world_setting, campaign_date]
  );

  if (result.rows.length === 0) {
    return json(404, { error: "Campaign not found" });
  }

  return json(200, result.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api-campaigns?id=UUID
------------------------------------------------------------ */
async function handleDELETE(event) {
  const auth = requireAdmin(event.headers);
  if (!auth.ok) return auth.response;

  const id = event.queryStringParameters?.id;
  if (!id) return json(400, { error: "id is required" });

  const result = await query(
    `DELETE FROM campaigns WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    return json(404, { error: "Campaign not found" });
  }

  return json(200, { success: true, id });
}

/* -----------------------------------------------------------
   MAIN HANDLER (Classic)
------------------------------------------------------------ */
export const handler = async (event, context) => {
  try {
    switch (event.httpMethod) {
      case "GET":
        return await handleGET(event);

      case "POST":
        return await handlePOST(event);

      case "PUT":
      case "PATCH":
        return await handlePUT(event);

      case "DELETE":
        return await handleDELETE(event);

      default:
        return json(405, { error: "Method Not Allowed" });
    }
  } catch (err) {
    console.error("api-campaigns error:", err);
    return json(500, { error: err.message || "Internal Server Error" });
  }
};
