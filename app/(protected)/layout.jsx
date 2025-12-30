import ProtectedHeader from "@/components/ProtectedHeader";
import Footer from "@/components/Footer";
import { GlobalAudioProvider } from "@/components/GlobalAudio";

export default function ProtectedLayout({ children }) {
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
