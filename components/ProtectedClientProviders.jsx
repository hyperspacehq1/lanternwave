"use client";

import { GlobalAudioProvider } from "@/components/GlobalAudio";
import ProtectedHeader from "@/components/ProtectedHeader";
import Footer from "@/components/Footer";

export default function ProtectedClientProviders({ children }) {
  return (
    <GlobalAudioProvider>
      <ProtectedHeader />
      <main className="lw-main">{children}</main>
      <Footer variant="protected" />
    </GlobalAudioProvider>
  );
}
