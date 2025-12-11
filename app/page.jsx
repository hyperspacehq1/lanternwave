import { redirect } from "next/navigation";

export default function Page() {
  // Immediately redirect the user to the controller
  redirect("/controller");
}