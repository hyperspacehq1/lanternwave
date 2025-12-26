export const runtime = "nodejs";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";

export default async function Page() {
  const cookieStore = cookies();
  const session = cookieStore.get("lw_session");

  if (!session) {
    redirect("/login");
  }

  const { rows } = await query(
    `
    SELECT u.id, u.email, u.is_admin
    FROM users u
    JOIN sessions s ON s.user_id = u.id
    WHERE s.token = $1
    `,
    [session.value]
  );

  if (!rows.length || !rows[0].is_admin) {
    redirect("/login");
  }

  return (
    <div>
      <h1>Admin Module</h1>
      <p>Welcome, {rows[0].email}</p>
    </div>
  );
}
