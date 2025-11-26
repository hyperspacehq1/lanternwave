// src/App.jsx
import React, { useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import ControllerPage from "./pages/Controller.jsx";
import PlayerPage from "./pages/PlayerPage.jsx";
import { LogoMark } from "./components/LogoMark.jsx";
import AccessGate from "./pages/AccessGate.jsx";

function App() {
  // -------------------------------------------------------------
  // 24-hour automatic unlock using localStorage
  // -------------------------------------------------------------
  const [unlocked, setUnlocked] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("lw_access"));
      if (!saved) return false;
      if (saved.unlocked && saved.expires > Date.now()) {
        return true;
      }
    } catch {}
    return false;
  });

  // -------------------------------------------------------------
  // Show AccessGate until unlocked
  // -------------------------------------------------------------
  if (!unlocked) {
    return (
      <AccessGate
        onUnlock={() => {
          const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
          localStorage.setItem(
            "lw_access",
            JSON.stringify({ unlocked: true, expires })
          );
          setUnlocked(true);
        }}
      />
    );
  }

  // -------------------------------------------------------------
  // Main Lanternwave app (unchanged)
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
        </Routes>
      </main>
    </div>
  );
}

export default App;
