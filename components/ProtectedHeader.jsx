"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";

export default function ProtectedHeader() {
  const pathname = usePathname();
  const isPlayer = pathname === "/player" || pathname.startsWith("/player/");
  return <Header variant={isPlayer ? "player" : "app"} />;
}
