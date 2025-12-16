"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoMark from "@/components/LogoMark";

/**
 * Header
 * - variant="app"    => GM/CM/Controller/Account (shows 5 app tabs + Logout)
 * - variant="public" => login/signup/forgot/reset (shows Support/Create Account/Sign In only)
 */
export default function Header({ variant = "app" }) {
  const pathname = usePathname();

  const appNavItems = [
    { label: "GM Dashboard", href: "/gm-dashboard" },
    { label: "Campaign Manager", href: "/campaign-manager" },
    { label: "Media Controller", href: "/controller" },
    { label: "Player", href: "/player" },
    { label: "My Account", href: "/account" },
  ];

  const publicNavItems = [
    { label: "Support", href: "/support" },
    { label: "Create Account", href: "/signup" },
    { label: "Sign In", href: "/" },
  ];

  const navItems = variant === "public" ? publicNavItems : appNavItems;

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
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

        <div className="lw-header-title">LANTERNWAVE</div>
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
              className={`lw-nav-link ${isActive ? "active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}

        {variant !== "public" && (
          <button
            onClick={handleLogout}
            className="lw-nav-link"
            type="button"
          >
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}
