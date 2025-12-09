// api-quests.js — Netlify 2025 Function
import { sql } from "../db.js";
import { v4 as uuid } from "uuid";

export default async (req, context) => {
  // --- AUTH CHECK ---
  const adminKey = process.env.ADMIN_KEY;
  const supplied = req.headers.get("x-admin-key");

  if (!adminKey || supplied !== adminKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { method } = req;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const campaign_id = url.searchParams.get("campaign_id");

  try {
    // ---------- GET ----------
    if (method === "GET") {
      if (id) {
        const result = await sql`SELECT * FROM quests WHERE id = ${id}`;
        return Response.json(result[0] || null);
      }
      if (campaign_id) {
        const result = await sql`
          SELECT * FROM quests
          WHERE campaign_id = ${campaign_id}
          ORDER BY created_at ASC
        `;
        return Response.json(result);
      }
      // All quests
      const all = await sql`SELECT * FROM quests ORDER BY created_at ASC`;
      return Response.json(all);
    }

    // ---------- POST (create) ----------
    if (method === "POST") {
      const body = await req.json();
      const newId = uuid();

      const row = await sql`
        INSERT INTO quests (id, campaign_id, description, status, created_at, updated_at)
        VALUES (${newId}, ${body.campaign_id}, ${body.description}, ${body.status || "open"}, NOW(), NOW())
        RETURNING *
      `;
      return Response.json(row[0]);
    }

    // ---------- PUT (update) ----------
    if (method === "PUT") {
      const body = await req.json();
      if (!id) {
        return Response.json({ error: "id is required" }, { status: 400 });
      }

      const row = await sql`
        UPDATE quests
        SET description = ${body.description},
            status = ${body.status},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      return Response.json(row[0]);
    }

    // ---------- DELETE ----------
    if (method === "DELETE") {
      if (!id) {
        return Response.json({ error: "id required" }, { status: 400 });
      }
      await sql`DELETE FROM quests WHERE id = ${id}`;
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unsupported method" }, { status: 405 });

  } catch (err) {
    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
};
