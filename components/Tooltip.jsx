"use client";

import { useState } from "react";

export default function Tooltip({ children, content }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="lw-tooltip-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span className="lw-tooltip">
          <strong className="lw-tooltip-title">
            {content.title}
          </strong>
          <span className="lw-tooltip-body">
            {content.body}
          </span>
        </span>
      )}
    </span>
  );
}
