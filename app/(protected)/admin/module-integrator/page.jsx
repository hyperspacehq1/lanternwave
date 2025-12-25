import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-server";
import ModuleIntegratorClient from "./ModuleIntegratorClient";

export default async function ModuleIntegratorPage() {
  const user = await requireAuth();

  if (!user) {
    redirect("/login");
  }

  if (!user.is_admin) {
    redirect("/"); // or show 403 page
  }

  return <ModuleIntegratorClient />;
}
