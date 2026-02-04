import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export default function CustomDropdown({ value, onChange, options, placeholder = "Select...", preferredDirection = "auto" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const [dropDirection, setDropDirection] = useState("down"); // "up" or "down"
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update menu position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const maxMenuHeight = 300; // matches maxHeight in menu styles
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let direction = "down";
      
      // Determine direction based on preference and available space
      if (preferredDirection === "up") {
        direction = "up";
      } else if (preferredDirection === "down") {
        direction = "down";
      } else {
        // Auto: choose based on available space
        direction = spaceBelow < maxMenuHeight && spaceAbove > spaceBelow ? "up" : "down";
      }
      
      setDropDirection(direction);
      
      if (direction === "up") {
        setMenuPosition({
          top: rect.top + window.scrollY - 4, // Position above button
          left: rect.left + window.scrollX,
          width: rect.width,
          bottom: true, // Flag to indicate drop-up positioning
        });
      } else {
        setMenuPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
          bottom: false,
        });
      }
    }
  }, [isOpen, preferredDirection]);

  // Get the display text for the selected value
  const selectedOption = options.find(opt => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "fit-content" }}>
      {/* Dropdown trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          minWidth: "200px",
          padding: "8px 12px",
          backgroundColor: "transparent",
          color: "rgb(229, 255, 227)",
          border: "1px solid rgb(163, 197, 159)",
          borderRadius: "4px",
          cursor: "pointer",
          fontFamily: 'system-ui, -apple-system, "system-ui", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          fontSize: "13px",
          fontWeight: 400,
          lineHeight: "normal",
          textAlign: "left",
          outline: "none",
          transition: "border-color 0.15s ease",
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgb(180, 210, 177)"}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgb(163, 197, 159)"}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgb(163, 197, 159)";
          e.currentTarget.style.boxShadow = "0 0 0 2px rgba(163, 197, 159, 0.2)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <span style={{ flex: 1 }}>{displayText}</span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="12" 
          height="12" 
          viewBox="0 0 12 12"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          <path fill="rgb(229, 255, 227)" d="M6 9L1 4h10z" />
        </svg>
      </button>

      {/* Dropdown menu - rendered with Portal to escape overflow constraints */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: "absolute",
            ...(menuPosition.bottom 
              ? { bottom: `calc(100vh - ${menuPosition.top}px)` } 
              : { top: `${menuPosition.top}px` }
            ),
            left: `${menuPosition.left}px`,
            width: `${menuPosition.width}px`,
            backgroundColor: "rgb(30, 40, 30)",
            border: "1px solid rgb(163, 197, 159)",
            borderRadius: "4px",
            maxHeight: "300px",
            overflowY: "auto",
            zIndex: 9999,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
          }}
        >
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={{
                padding: "8px 12px",
                color: value === option.value ? "rgb(108, 196, 23)" : "rgb(229, 255, 227)",
                backgroundColor: value === option.value ? "rgba(108, 196, 23, 0.1)" : "transparent",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: 'system-ui, -apple-system, "system-ui", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.backgroundColor = "rgba(163, 197, 159, 0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.backgroundColor = "transparent";
                } else {
                  e.currentTarget.style.backgroundColor = "rgba(108, 196, 23, 0.1)";
                }
              }}
            >
              {option.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
