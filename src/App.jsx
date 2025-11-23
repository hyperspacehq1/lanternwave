// src/App.jsx
import React from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import ControllerPage from "./pages/Controller.jsx";
import PlayerPage from "./pages/PlayerPage.jsx";
import { LogoMark } from "./components/LogoMark.jsx";

function App() {
  return (
    <div className="lw-root">
      <header className="lw-header">
        <div className="lw-header-left">
          <LogoMark />
          <div className="lw-title-block">
            <h1 className="lw-app-title">LANTERNWAVE</h1>
            <p className="lw-app-subtitle">Gordon Control Console</p>
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
