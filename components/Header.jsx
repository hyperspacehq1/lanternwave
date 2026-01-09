"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoMark from "@/components/LogoMark";

/**
 * Header
 * - variant="app"    => GM/CM/Controller/Account
 * - variant="public" => login/signup/forgot/reset
 * - variant="player" => Player view (logo + title only)
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
    { label: "Sign In", href: "/login" },
  ];

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      window.location.href = "/login";
    }
  }

  // 🎯 Logo + title destination
  const homeHref =
    variant === "public"
      ? "/login"
      : variant === "app"
      ? "/gm-dashboard"
      : null;

  // ✅ PLAYER MODE (no links)
  if (variant === "player") {
    return (
      <header className="lw-header">
        <div className="lw-header-left">
          <div className="lw-logo-wrap">
            <LogoMark />
          </div>
          <div className="lw-header-title">LANTERNWAVE</div>
        </div>
      </header>
    );
  }

  const navItems = variant === "public" ? publicNavItems : appNavItems;

  return (
    <header className="lw-header">
      {/* LEFT */}
      <div className="lw-header-left">
        {homeHref ? (
          <Link href={homeHref} className="lw-brand">
            <span className="lw-logo-wrap">
              <LogoMark />
            </span>
            <span className="lw-header-title">LANTERNWAVE</span>
          </Link>
        ) : (
          <>
            <div className="lw-logo-wrap">
              <LogoMark />
            </div>
            <div className="lw-header-title">LANTERNWAVE</div>
          </>
        )}
      </div>

      {/* RIGHT NAV */}
      <nav className="lw-nav">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

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

        {variant === "app" && (
          <button onClick={handleLogout} className="lw-nav-link" type="button">
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}
