import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-server";
import ProtectedHeader from "@/components/ProtectedHeader";
import Footer from "@/components/Footer";
import { GlobalAudioProvider } from "@/components/GlobalAudio";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }) {
  try {
    // ✅ Auth gate at layout level
    await requireAuth();
  } catch {
    // ✅ Never throw from a Server Component
    redirect("/login");
  }

  return (
    <GlobalAudioProvider>
      <ProtectedHeader />
      <main className="lw-main">
        {children}
      </main>
      <Footer variant="protected" />
    </GlobalAudioProvider>
  );
}
