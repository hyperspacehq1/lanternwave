import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/auth/getTenantContext";

export default async function Page() {
  const ctx = await getTenantContext();

  // If not logged in OR not admin → block
  if (!ctx || !ctx.isAdmin) {
    redirect("/not-authorized");
  }

  // Otherwise render the page
  return (
    <div>
      <h1>Admin Module</h1>
      <p>You are authorized.</p>
    </div>
  );
}
