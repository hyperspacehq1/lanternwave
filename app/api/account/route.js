import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    /* -------------------------
       Read session cookie
       ------------------------- */
    const sessionCookie = req.cookies.get("lw_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { code: "NOT_AUTHENTICATED", message: "No active session." },
        { status: 401 }
      );
    }

    /* -------------------------
       Load user
       ------------------------- */
    const userRes = await query(
      `
      SELECT
        id,
        email,
        username,
        created_at
      FROM users
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [sessionCookie]
    );

    if (userRes.rowCount === 0) {
      return NextResponse.json(
        { code: "USER_NOT_FOUND", message: "Account not found." },
        { status: 404 }
      );
    }

    const user = userRes.rows[0];

    /* -------------------------
       Success
       ------------------------- */
    return NextResponse.json({
      ok: true,
      account: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.created_at,
      },
    });

  } catch (err) {
    console.error("ACCOUNT LOAD FAILED:", err);

    return new NextResponse(
      JSON.stringify({
        code: "ACCOUNT_LOAD_FAILED",
        message: err?.message || "Failed to load account",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
