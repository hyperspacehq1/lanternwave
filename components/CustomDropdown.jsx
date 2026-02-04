import React, { useState, useRef, useEffect } from "react";

export default function CustomDropdown({ value, onChange, options, placeholder = "Select..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  // Get the display text for the selected value
  const selectedOption = options.find(opt => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "fit-content" }}>
      {/* Dropdown trigger button */}
      <button
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

      {/* Dropdown menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            backgroundColor: "rgb(30, 40, 30)",
            border: "1px solid rgb(163, 197, 159)",
            borderRadius: "4px",
            maxHeight: "300px",
            overflowY: "auto",
            zIndex: 1000,
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
        </div>
      )}
    </div>
  );
}

