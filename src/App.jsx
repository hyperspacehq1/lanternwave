// src/App.jsx
import React, { useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";

import ControllerPage from "./pages/Controller.jsx";
import PlayerPage from "./pages/PlayerPage.jsx";
import MissionManagerPage from "./pages/MissionManagerPage.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";

import AccessGate from "./pages/AccessGate.jsx";
import { LogoMark } from "./components/LogoMark.jsx";

function App() {
  // -------------------------------------------------------------
  // Persistent Unlock (24 hours)
  // -------------------------------------------------------------
  const [unlocked, setUnlocked] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("lw_access"));
      if (saved?.unlocked && saved.expires > Date.now()) {
        return true;
      }
    } catch {}
    return false;
  });

  const handleUnlock = () => {
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    localStorage.setItem(
      "lw_access",
      JSON.stringify({ unlocked: true, expires })
    );
    setUnlocked(true);
  };

  // -------------------------------------------------------------
  // LOCKED STATE → Show AccessGate only
  // -------------------------------------------------------------
  if (!unlocked) {
    return <AccessGate onUnlock={handleUnlock} />;
  }

  // -------------------------------------------------------------
  // MAIN LANTERNWAVE APP (header restored)
  // -------------------------------------------------------------
  return (
    <div className="lw-root">
      <header className="lw-header">
        <div className="lw-header-left">
          <LogoMark />

          <div className="lw-title-block">
            <h1 className="lw-app-title">LANTERNWAVE</h1>
            <p className="lw-app-subtitle">Control Console</p>
          </div>
        </div>

        <nav className="lw-nav">
          <NavLink
            to="/mission-manager"
            className={({ isActive }) =>
              "lw-nav-link" + (isActive ? " lw-nav-link-active" : "")
            }
          >
            Mission Manager
          </NavLink>

          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              "lw-nav-link" + (isActive ? " lw-nav-link-active" : "")
            }
          >
            Host Console
          </NavLink>

          <NavLink
            to="/player"
            className={({ isActive }) =>
              "lw-nav-link" + (isActive ? " lw-nav-link-active" : "")
            }
          >
            Player Viewer
          </NavLink>
        </nav>
      </header>

      <main className="lw-main">
        <Routes>
          <Route path="/" element={<ControllerPage />} />
          <Route path="/player" element={<PlayerPage />} />
          <Route path="/mission-manager" element={<MissionManagerPage />} />

          {/* Privacy Policy (for Twilio) */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          {/* Fallback */}
          <Route
            path="*"
            element={
              <div style={{ color: "white", padding: "40px" }}>
                404 — Page Not Found
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
