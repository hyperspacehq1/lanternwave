// netlify/functions/api-campaigns.js
import { NetlifyRequest, NetlifyResponse } from "@netlify/functions";
import { query } from "../util/db.js";
import { requireAdmin } from "../util/auth.js";

/* -----------------------------------------------------------
   GET /api-campaigns
   - list all campaigns OR get a single campaign via ?id=
------------------------------------------------------------ */
async function handleGET(request) {
  const id = request.query.get("id");

  if (id) {
    // Fetch a single campaign by ID
    const result = await query(
      `SELECT *
       FROM campaigns
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NetlifyResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NetlifyResponse.json(result.rows[0]);
  }

  // Fetch all campaigns
  const result = await query(
    `SELECT *
     FROM campaigns
     ORDER BY created_at DESC`
  );

  return NetlifyResponse.json(result.rows);
}

/* -----------------------------------------------------------
   POST /api-campaigns
   Create a new campaign
------------------------------------------------------------ */
async function handlePOST(request) {
  const auth = requireAdmin(request.headers);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const {
    name,
    description,
    world_setting,
    campaign_date
  } = body;

  if (!name) {
    return NetlifyResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
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

  return NetlifyResponse.json(result.rows[0], { status: 201 });
}

/* -----------------------------------------------------------
   PUT /api-campaigns?id=
   Update an existing campaign
------------------------------------------------------------ */
async function handlePUT(request) {
  const auth = requireAdmin(request.headers);
  if (!auth.ok) return auth.response;

  const id = request.query.get("id");
  if (!id) {
    return NetlifyResponse.json(
      { error: "id is required" },
      { status: 400 }
    );
  }

  const body = await request.json();
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
    return NetlifyResponse.json(
      { error: "Campaign not found" },
      { status: 404 }
    );
  }

  return NetlifyResponse.json(result.rows[0]);
}

/* -----------------------------------------------------------
   DELETE /api-campaigns?id=
------------------------------------------------------------ */
async function handleDELETE(request) {
  const auth = requireAdmin(request.headers);
  if (!auth.ok) return auth.response;

  const id = request.query.get("id");

  if (!id) {
    return NetlifyResponse.json(
      { error: "id is required" },
      { status: 400 }
    );
  }

  const result = await query(
    `DELETE FROM campaigns WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    return NetlifyResponse.json(
      { error: "Campaign not found" },
      { status: 404 }
    );
  }

  return NetlifyResponse.json({ success: true, id });
}

/* -----------------------------------------------------------
   MAIN HANDLER (Netlify 2025)
------------------------------------------------------------ */
export default async function handler(request: NetlifyRequest) {
  try {
    switch (request.method) {
      case "GET":
        return await handleGET(request);

      case "POST":
        return await handlePOST(request);

      case "PUT":
      case "PATCH":
        return await handlePUT(request);

      case "DELETE":
        return await handleDELETE(request);

      default:
        return NetlifyResponse.json(
          { error: "Method Not Allowed" },
          { status: 405 }
        );
    }
  } catch (err) {
    console.error("api-campaigns error:", err);
    return NetlifyResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
