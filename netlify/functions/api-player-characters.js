import { sql } from "../db.js";
import { v4 as uuid } from "uuid";

export default async (req, context) => {
  const adminKey = process.env.ADMIN_KEY;
  const supplied = req.headers.get("x-admin-key");

  if (!adminKey || supplied !== adminKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { method } = req;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  try {
    // GET
    if (method === "GET") {
      if (id) {
        const row = await sql`SELECT * FROM player_characters WHERE id = ${id}`;
        return Response.json(row[0] || null);
      }
      const list = await sql`SELECT * FROM player_characters ORDER BY created_at ASC`;
      return Response.json(list);
    }

    // POST
    if (method === "POST") {
      const body = await req.json();
      const newId = uuid();

      const row = await sql`
        INSERT INTO player_characters
          (id, first_name, last_name, phone, email, created_at, updated_at)
        VALUES
          (${newId}, ${body.first_name}, ${body.last_name}, ${body.phone}, ${body.email}, NOW(), NOW())
        RETURNING *
      `;
      return Response.json(row[0]);
    }

    // PUT
    if (method === "PUT") {
      if (!id) return Response.json({ error: "id required" }, { status: 400 });
      const body = await req.json();

      const row = await sql`
        UPDATE player_characters
        SET first_name = ${body.first_name},
            last_name = ${body.last_name},
            phone = ${body.phone},
            email = ${body.email},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      return Response.json(row[0]);
    }

    // DELETE
    if (method === "DELETE") {
      if (!id) return Response.json({ error: "id required" }, { status: 400 });
      await sql`DELETE FROM player_characters WHERE id = ${id}`;
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unsupported method" }, { status: 405 });

  } catch (err) {
    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
};
