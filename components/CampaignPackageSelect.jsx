"use client";

import { useEffect, useState } from "react";

/**
 * CampaignPackageSelect
 *
 * - Fetches available Adventure Codex packages from /api/campaign-packages
 * - Always supports "standard" as a fallback
 * - Controlled via `value` + `onChange`
 * - Can be disabled (used for existing campaigns)
 *
 * Props:
 *   value: string | undefined
 *   onChange: (value: string) => void
 *   disabled?: boolean
 */
export default function CampaignPackageSelect({
  value,
  onChange,
  disabled = false,
}) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadPackages() {
      try {
        const res = await fetch("/api/campaign-packages", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to load campaign packages");
        }

        const data = await res.json();

        if (mounted) {
          setPackages(data);
        }
      } catch (err) {
        // Fail safe: only Standard
        if (mounted) {
          setError("Unable to load Adventure Codex list.");
          setPackages([
            {
              value: "standard",
              label: "Standard (Blank Campaign)",
              description:
                "Start with an empty campaign and build it manually.",
            },
          ]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadPackages();

    return () => {
      mounted = false;
    };
  }, []);

  const selected =
    packages.find((p) => p.value === value) ||
    packages.find((p) => p.value === "standard");

  return (
    <div className="form-group">
      <label htmlFor="campaignPackage">
        Adventure Codex (optional)
      </label>

      <select
        id="campaignPackage"
        name="campaignPackage"
        value={value ?? "standard"}
        disabled={loading || disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {packages.map((pkg) => (
          <option key={pkg.value} value={pkg.value}>
            {pkg.label}
          </option>
        ))}
      </select>

      {loading && (
        <p className="help-text">
          Loading available Adventure Codexes…
        </p>
      )}

      {!loading && error && (
        <p className="help-text error">
          {error}
        </p>
      )}

      {!loading && selected?.description && (
        <p className="help-text">
          {selected.description}
        </p>
      )}
    </div>
  );
}
