"use client";

import React, { useState } from "react";
import DiceRoller from "./tools/DiceRoller";
// import InitiativeTracker from "./tools/InitiativeTracker";
// import AudioController from "./tools/AudioController";
// import Conditions from "./tools/Conditions";

import "./tools.css";

const TOOL_SECTIONS = [
  { id: "dice", label: "Dice Roller" },
  { id: "initiative", label: "Initiative" },
  { id: "audio", label: "Audio Control" },
  { id: "conditions", label: "Conditions" },
];

export default function Tools() {
  const [activeTool, setActiveTool] = useState("dice");

  const renderTool = () => {
    switch (activeTool) {
      case "dice":
        return <DiceRoller />;

      case "initiative":
        return (
          <div className="gm-tool-placeholder">
            Initiative Tracker Coming Soon…
          </div>
        );

      case "audio":
        return (
          <div className="gm-tool-placeholder">
            Audio Controller Coming Soon…
          </div>
        );

      case "conditions":
        return (
          <div className="gm-tool-placeholder">
            Conditions / Status Effects Coming Soon…
          </div>
        );

      default:
        return (
          <div className="gm-tool-placeholder">
            Select a tool from the left panel.
          </div>
        );
    }
  };

  return (
    <div className="gm-tools-root">
      {/* TOOL SELECTOR */}
      <aside className="gm-tools-nav">
        <h2 className="gm-tools-title">GM Tools</h2>

        {TOOL_SECTIONS.map((t) => (
          <button
            key={t.id}
            className={
              t.id === activeTool
                ? "gm-tools-btn active"
                : "gm-tools-btn"
            }
            onClick={() => setActiveTool(t.id)}
          >
            {t.label}
          </button>
        ))}
      </aside>

      {/* ACTIVE TOOL PANEL */}
      <section className="gm-tools-panel">
        {renderTool()}
      </section>
    </div>
  );
}
