import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ModuleIntegratorClient from "./ModuleIntegratorClient";

export default async function ModuleIntegratorPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.isAdmin) {
    redirect("/login");
  }

  return <ModuleIntegratorClient />;
}
