import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { verifyPassword, hashPassword } from "@/lib/auth/passwords";
import db from "@/lib/db";

export async function PUT(req) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Missing password fields" },
      { status: 400 }
    );
  }

  const record = await db.one(
    `SELECT password_hash FROM users WHERE id = $1`,
    [user.id]
  );

  const ok = await verifyPassword(
    currentPassword,
    record.password_hash
  );

  if (!ok) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 403 }
    );
  }

  const newHash = await hashPassword(newPassword);

  await db.none(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [newHash, user.id]
  );

  return NextResponse.json({ success: true });
}
