import React, { useState } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";

import AccessGate from "./pages/AccessGate.jsx";
import Controller from "./pages/Controller.jsx";
import PlayerPage from "./pages/PlayerPage.jsx";
import MissionManagerPage from "./pages/MissionManagerPage.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";

export default function App() {
  const location = useLocation();
  const [unlocked, setUnlocked] = useState(false);

  const showNav =
    location.pathname !== "/" &&
    location.pathname !== "/access" &&
    location.pathname !== "/privacy-policy";

  return (
    <div className="lw-root">
      {showNav && (
        <header className="lw-header">
          <div className="lw-header-left">
            <div className="lw-logo-wrap">
              <img src="/lanterwave-logo.png" className="lw-logo" />
            </div>

            <div className="lw-title-block">
              <h1 className="lw-app-title">LANTERNWAVE</h1>
              <div className="lw-app-subtitle">CONTROL INTERFACE</div>
            </div>
          </div>

          <nav className="lw-nav">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? "lw-nav-link lw-nav-link-active" : "lw-nav-link"
              }
            >
              Host Console
            </NavLink>

            <NavLink
              to="/player"
              className={({ isActive }) =>
                isActive ? "lw-nav-link lw-nav-link-active" : "lw-nav-link"
              }
            >
              Player Viewer
            </NavLink>

            <NavLink
              to="/mission-manager"
              className={({ isActive }) =>
                isActive ? "lw-nav-link lw-nav-link-active" : "lw-nav-link"
              }
            >
              Mission Manager
            </NavLink>
          </nav>
        </header>
      )}

      <main className="lw-main">
        <Routes>
          <Route
            path="/"
            element={
              unlocked ? (
                <Controller />
              ) : (
                <AccessGate onUnlock={() => setUnlocked(true)} />
              )
            }
          />

          <Route
            path="/access"
            element={
              unlocked ? (
                <Controller />
              ) : (
                <AccessGate onUnlock={() => setUnlocked(true)} />
              )
            }
          />

          <Route path="/player" element={<PlayerPage />} />
          <Route path="/mission-manager" element={<MissionManagerPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

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
