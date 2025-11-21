// src/components/LogoMark.jsx
import React from "react";

export const LogoMark = () => {
  return (
    <div className="lw-logo-wrap">
      {/* Assume /lanterwave-logo.png is in public/ */}
      <img
        src="/lanterwave-logo.png"
        alt="Lanternwave"
        className="lw-logo lw-logo-large"
      />
    </div>
  );
};
