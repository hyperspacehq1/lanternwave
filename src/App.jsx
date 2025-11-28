import React, { useState } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";

import AccessGate from "./pages/AccessGate.jsx";
import Controller from "./pages/Controller.jsx";
import PlayerPage from "./pages/PlayerPage.jsx";
import MissionManagerPage from "./pages/MissionManagerPage.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";

export default function App() {
  const location = useLocation();

  // NEW — unlock state so AccessGate can disappear
  const [unlocked, setUnlocked] = useState(false);

  // Show nav ONLY when inside the authenticated app
  const showNav =
    location.pathname !== "/" &&
    location.pathname !== "/access" &&
    location.pathname !== "/privacy-policy";

  return (
    <div className="lw-root">

      {/* Navigation — Hidden on the Access Gate */}
      {showNav && (
        <header className="lw-header">
          <nav className="lw-nav">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? "lw-nav-item active" : "lw-nav-item"
              }
            >
              Host Console
            </NavLink>

            <NavLink
              to="/player"
              className={({ isActive }) =>
                isActive ? "lw-nav-item active" : "lw-nav-item"
              }
            >
              Player Viewer
            </NavLink>

            <NavLink
              to="/mission-manager"
              className={({ isActive }) =>
                isActive ? "lw-nav-item active" : "lw-nav-item"
              }
            >
              Mission Manager
            </NavLink>
          </nav>
        </header>
      )}

      <main className="lw-main">
        <Routes>

          {/* ROOT ACCESS ROUTE */}
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

          {/* OPTIONAL ACCESS ROUTE */}
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

          {/* PLAYER PAGE */}
          <Route path="/player" element={<PlayerPage />} />

          {/* MISSION MANAGER */}
          <Route path="/mission-manager" element={<MissionManagerPage />} />

          {/* PRIVACY POLICY */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          {/* FAILSAFE 404 */}
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
