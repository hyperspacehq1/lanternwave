import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import ModuleIntegratorClient from "./ModuleIntegratorClient";

export default async function Page() {
  const cookieStore = cookies();
  const session = cookieStore.get("lw_session");

  if (!session) {
    redirect("/login");
  }

  return <ModuleIntegratorClient />;
}
