import "../globals.css";
import { requireAuth } from "@/lib/auth";
import Header from "@/components/Header";

export default async function ProtectedLayout({ children }) {
// await requireAuth();

  return (
    <div className="lw-app-root">
      <Header />
      <main className="lw-main">
        {children}
      </main>
    </div>
  );
}
