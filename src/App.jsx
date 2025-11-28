// src/App.jsx
import { Routes, Route, Link, useLocation } from "react-router-dom";

// FIXED PATHS — All pages are in /src/pages/
import AccessGate from "./pages/AccessGate.jsx";
import Controller from "./pages/Controller.jsx";
import PlayerPage from "./pages/PlayerPage.jsx";
import MissionManagerPage from "./pages/MissionManagerPage.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";

export default function App() {
  const location = useLocation();

  const showNav =
    location.pathname !== "/" &&
    location.pathname !== "/access" &&
    location.pathname !== "/privacy-policy";

  return (
    <div className="lw-root">

      {/* Top Navigation */}
      {showNav && (
        <header className="lw-header">
          <div className="lw-header-left">
            <Link to="/" className="lw-logo-wrap">
              <img src="/lanterwave-logo.png" className="lw-logo" />
            </Link>

            <div className="lw-title-block">
              <p className="lw-app-title">LANTERNWAVE</p>
              <p className="lw-app-subtitle">AUDIO / VISUAL CONTROL NODE</p>
            </div>
          </div>

          <nav className="lw-nav">
            <Link
              to="/"
              className={`lw-nav-link ${
                location.pathname === "/" ? "lw-nav-link-active" : ""
              }`}
            >
              Host Console
            </Link>

            <Link
              to="/player"
              className={`lw-nav-link ${
                location.pathname === "/player" ? "lw-nav-link-active" : ""
              }`}
            >
              Player Viewer
            </Link>

            <Link
              to="/mission-manager"
              className={`lw-nav-link ${
                location.pathname === "/mission-manager" ? "lw-nav-link-active" : ""
              }`}
            >
              Mission Manager
            </Link>
          </nav>
        </header>
      )}

      {/* Routes */}
      <main className="lw-main">
        <Routes>
          <Route path="/" element={<AccessGate />} />
          <Route path="/access" element={<AccessGate />} />

          {/* FIXED: Privacy Policy route */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          <Route path="/player" element={<PlayerPage />} />

          <Route
            path="/mission-manager"
            element={<MissionManagerPage />}
          />

          {/* Fallback */}
          <Route
            path="*"
            element={<div style={{ color: "white" }}>404 — Page Not Found</div>}
          />
        </Routes>
      </main>
    </div>
  );
}
