import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { GlobalAudioProvider } from "@/components/GlobalAudio";

export default function ProtectedLayout({ children }) {
  return (
    <GlobalAudioProvider>
      <Header variant="app" />
      <main className="lw-main">
        {children}
      </main>
      <Footer variant="protected" />
    </GlobalAudioProvider>
  );
}
