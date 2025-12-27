import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default async function ProtectedLayout({ children }) {
  return (
    <>
      <Header variant="app" />
      <main className="lw-main">
        {children}
      </main>
      <Footer variant="protected" />
    </>
  );
}

import { GlobalAudioProvider } from "@/components/GlobalAudio";

export default function WithAudioLayout({ children }) {
  return <GlobalAudioProvider>{children}</GlobalAudioProvider>;
}

