import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink } from "react-router-dom";

import ControllerPage from "./pages/Controller";
import PlayerPage from "./pages/Player";
import MissionManagerPage from "./pages/MissionManagerPage";

// NEW IMPORT
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";

export default function App() {
  const [hasBooted, setHasBooted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasBooted(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!hasBooted) {
    return (
      <div className="boot-container">
        <div className="boot-text">
          <p>BOOTING LANTERNWAVE TERMINAL...</p>
          <p>INITIALIZING SYSTEM MODULES…</p>
          <p>LOADING DIRECTOR AI INTERFACE…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <nav className="top-nav">
        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive ? "nav-button active" : "nav-button"
          }
        >
          Host Console
        </NavLink>

        <NavLink
          to="/player"
          className={({ isActive }) =>
            isActive ? "nav-button active" : "nav-button"
          }
        >
          Player Viewer
        </NavLink>

        <NavLink
          to="/mission-manager"
          className={({ isActive }) =>
            isActive ? "nav-button active" : "nav-button"
          }
        >
          Mission Manager
        </NavLink>
      </nav>

      {/* Page Routes */}
      <Routes>
        <Route path="/" element={<ControllerPage />} />
        <Route path="/player" element={<PlayerPage />} />
        <Route path="/mission-manager" element={<MissionManagerPage />} />

        {/* NEW PRIVACY POLICY ROUTE */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      </Routes>

      {/* NEW FOOTER FOR TWILIO COMPLIANCE */}
      <footer
        style={{
          marginTop: "40px",
          padding: "20px",
          textAlign: "center",
          borderTop: "1px solid #333",
          opacity: 0.8,
        }}
      >
        <a
          href="/privacy-policy"
          style={{
            color: "#6cc5f0",
            fontSize: "0.9rem",
            textDecoration: "underline",
          }}
        >
          Privacy Policy
        </a>
      </footer>
    </div>
  );
}
