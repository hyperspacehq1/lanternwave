import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const testId = uuidv4();

    // 1. INSERT (POST)
    const insertResult = await sql.query(
      `
      INSERT INTO test_crud (id, name, value, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
      `,
      [testId, "Test Insert", "Initial Value"]
    );

    const inserted = insertResult.rows?.[0];

    // 2. UPDATE (PUT)
    const updateResult = await sql.query(
      `
      UPDATE test_crud
      SET name = $1,
          value = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
      `,
      ["Updated Name", "Updated Value", testId]
    );

    const updated = updateResult.rows?.[0];

    // 3. SELECT (GET)
    const selectResult = await sql`
      SELECT * FROM test_crud WHERE id = ${testId}
    `;

    const selected = Array.isArray(selectResult)
      ? selectResult[0]
      : selectResult.rows?.[0];

    // 4. DELETE (DELETE)
    await sql.query(
      `DELETE FROM test_crud WHERE id = $1`,
      [testId]
    );

    return NextResponse.json({
      status: "ok",
      inserted,
      updated,
      selected
    });

  } catch (err) {
    console.error("debug-crud error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
