import { cookies } from "next/headers";

export default function Page() {
  const cookieStore = cookies();
  return <div>Cookies OK</div>;
}