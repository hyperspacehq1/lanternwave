import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("lw_session")?.value;

  if (!raw) {
    redirect("/login");
  }

  const SECRET = process.env.AUTH_SECRET;
  if (!SECRET) {
    throw new Error("AUTH_SECRET is not set");
  }

  const [payloadB64, sig] = raw.split(".");
  if (!payloadB64 || !sig) {
    redirect("/login");
  }

  const expectedSig = crypto
    .createHmac("sha256", SECRET)
    .update(payloadB64)
    .digest("hex");

  if (
    expectedSig.length !== sig.length ||
    !crypto.timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(sig)
    )
  ) {
    redirect("/login");
  }

  let payload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString()
    );
  } catch {
    redirect("/login");
  }

  const userId = payload?.userId;
  if (!userId) {
    redirect("/login");
  }

  const userRes = await query(
    `SELECT id, is_admin FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [userId]
  );

  const user = userRes.rows[0];

  if (!user || !user.is_admin) {
    redirect("/");
  }

  return <>{children}</>;
}