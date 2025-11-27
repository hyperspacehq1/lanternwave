import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink } from "react-router-dom";

import ControllerPage from "./pages/Controller";
import PlayerPage from "./pages/PlayerPage";
import MissionManagerPage from "./pages/MissionManagerPage";

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
      </Routes>
    </div>
  );
}

