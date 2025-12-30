"use client";

export default function SearchBar({ onSearch }) {
  return (
    <input
      type="text"
      placeholder="Search..."
      className="gm-search-bar"
      onChange={(e) => onSearch?.(e.target.value)}
    />
  );
}
