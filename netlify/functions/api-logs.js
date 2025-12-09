import { sql } from "../db.js";
import { v4 as uuid } from "uuid";

export default async (req, context) => {
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
  const session_id = url.searchParams.get("session_id");

  try {
    // GET
    if (method === "GET") {
      if (id) {
        const row = await sql`SELECT * FROM logs WHERE id = ${id}`;
        return Response.json(row[0] || null);
      }
      if (session_id) {
        const list = await sql`
          SELECT * FROM logs
          WHERE session_id = ${session_id}
          ORDER BY created_at ASC
        `;
        return Response.json(list);
      }
      const all = await sql`SELECT * FROM logs ORDER BY created_at ASC`;
      return Response.json(all);
    }

    // POST
    if (method === "POST") {
      const body = await req.json();
      const newId = uuid();

      const row = await sql`
        INSERT INTO logs (id, session_id, title, body, created_at, updated_at)
        VALUES (${newId}, ${body.session_id}, ${body.title}, ${body.body}, NOW(), NOW())
        RETURNING *
      `;
      return Response.json(row[0]);
    }

    // PUT
    if (method === "PUT") {
      if (!id) return Response.json({ error: "id required" }, { status: 400 });
      const body = await req.json();

      const row = await sql`
        UPDATE logs
        SET title = ${body.title},
            body = ${body.body},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      return Response.json(row[0]);
    }

    // DELETE
    if (method === "DELETE") {
      if (!id) return Response.json({ error: "id required" }, { status: 400 });
      await sql`DELETE FROM logs WHERE id = ${id}`;
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unsupported method" }, { status: 405 });

  } catch (err) {
    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
};
