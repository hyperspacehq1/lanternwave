"use client";

import React from "react";
import { useEffect, useState, useRef } from "react";
import "../../styles/original.css"; // ← THIS LOADS ALL THE REAL DESIGN

// ... keep all your logic and helper functions exactly as-is ...

export default function ControllerPage() {
  // your state and handlers unchanged …

  return (
    <div className="lw-root">
      
      {/* HEADER BAR */}
      <header className="lw-header">
        <div className="lw-header-left">
          <div className="lw-logo-wrap">
            <img src="/lanternwave-logo.png" className="lw-logo" alt="logo" />
          </div>
          <div className="lw-title-block">
            <h1 className="lw-app-title">LANTERNWAVE</h1>
            <p className="lw-app-subtitle">Host Controller</p>
          </div>
        </div>

        <nav className="lw-nav">
          <a href="/controller" className="lw-nav-link lw-nav-link-active">
            Controller
          </a>
          <a href="/player" className="lw-nav-link">
            Player View
          </a>
          <a href="/campaign-manager" className="lw-nav-link">
            Campaign Manager
          </a>
        </nav>
      </header>

      {/* MAIN AREA */}
      <main className="lw-main">

        {/* Your original controller UI */}
        <div className="lw-console">

          {/* UPLOAD PANEL */}
          <section className="lw-panel">
            <h2 className="lw-panel-title">UPLOAD CLIP</h2>
            {/* … unchanged code … */}
          </section>

          {/* LIBRARY PANEL */}
          <section className="lw-panel">
            <h2 className="lw-panel-title">CLIP LIBRARY</h2>
            {/* … unchanged code … */}
          </section>

          {/* PREVIEW PANEL */}
          <section className="lw-panel">
            <h2 className="lw-panel-title">AUDIENCE PREVIEW</h2>
            {/* … unchanged code … */}
          </section>

        </div>
      </main>
    </div>
  );
}
