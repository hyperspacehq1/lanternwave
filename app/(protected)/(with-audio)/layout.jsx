"use client";

import { GlobalAudioProvider } from "@/components/GlobalAudio";

export default function WithAudioLayout({ children }) {
  return <GlobalAudioProvider>{children}</GlobalAudioProvider>;
}
