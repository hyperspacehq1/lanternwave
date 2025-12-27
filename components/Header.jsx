"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoMark from "@/components/LogoMark";

export default function Header({ variant = "app" }) {
  const pathname = usePathname();

  const appNavItems = [
    { label: "GM Dashboard", href: "/gm-dashboard" },
    { label: "Campaign Manager", href: "/campaign-manager" },
    { label: "Media Controller", href: "/controller" },
    { label: "Player", href: "/player" },
    { label: "My Account", href: "/account" },
  ];

  // ===== PLAYER MODE (logo only) =====
  if (variant === "player") {
    return (
      <header className="lw-header">
        <div className="lw-header-left">
          <LogoMark />
          <span className="lw-header-title">LANTERNWAVE</span>
        </div>
      </header>
    );
  }

  // ===== NORMAL APP HEADER =====
  return (
    <header className="lw-header">
      <div className="lw-header-left">
        <LogoMark />
        <span className="lw-header-title">LANTERNWAVE</span>
      </div>

      <nav className="lw-nav">
        {appNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`lw-nav-link ${isActive ? "active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
