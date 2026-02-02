"use client";

import { useEffect, useRef, useState } from "react";

export default function CustomDropdown({ 
  value, 
  options, 
  onSelect, 
  disabled, 
  placeholder = "Select..." 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        className="gm-toolbar-select-btn"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        type="button"
      >
        {value || placeholder}
        <span className="dropdown-arrow">▼</span>
      </button>
      
      {isOpen && (
        <div className="gm-dropdown-menu">
          {options.length === 0 ? (
            <div className="gm-dropdown-item" style={{ opacity: 0.5, cursor: 'default' }}>
              No options available
            </div>
          ) : (
            options.map((opt) => (
              <div
                key={opt.id}
                className="gm-dropdown-item"
                onClick={() => {
                  onSelect(opt.id);
                  setIsOpen(false);
                }}
              >
                {opt.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
