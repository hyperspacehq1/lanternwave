"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LogoMark from "@/components/LogoMark";

/**
 * Global authenticated header
 * Rendered ONLY inside (app)/layout.jsx
 */
export default function Header({ auth }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { label: "GM Dashboard", href: "/gm-dashboard" },
    { label: "Campaign Manager", href: "/campaign-manager" },
    { label: "Controller", href: "/controller" },
    { label: "My Account", href: "/account" },
  ];

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      // Force full auth re-evaluation
      window.location.href = "/";
    }
  }

  return (
    <header className="lw-header">
      {/* LEFT */}
      <div className="lw-header-left">
        <div className="lw-logo-wrap">
          <LogoMark />
        </div>

        <div className="lw-title-block">
          <h1 className="lw-app-title">LANTERNWAVE</h1>
          <p className="lw-app-subtitle">
            {auth?.tenant_name || "Campaign System"}
          </p>
        </div>
      </div>

      {/* RIGHT NAV */}
      <nav className="lw-nav">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`lw-nav-link ${
                isActive ? "lw-nav-link-active" : ""
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        {/* LOGOUT */}
        <button
          onClick={handleLogout}
          className="lw-nav-link lw-nav-link-logout"
          type="button"
        >
          Logout
        </button>
      </nav>
    </header>
  );
}
