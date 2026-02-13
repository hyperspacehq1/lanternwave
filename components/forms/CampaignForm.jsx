"use client";

import React, { useEffect, useState } from "react";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

const RPG_GAMES = [
  "ALIEN: The Roleplaying Game",
  "Avatar Legends: The Roleplaying Game",
  "Black Powder & Brimstone",
  "Blade Runner: The Roleplaying Game",
  "Call of Cthulhu",
  "Coriolis: The Great Dark",
  "Cyberpunk TTRPG",
  "Cypher System / Daggerheart",
  "Delta Green",
  "Dragonbane",
  "Dungeon Crawl Classics",
  "Dungeons & Dragons 5th Edition",
  "Fabula Ultima",
  "Forbidden Lands",
  "Into the Odd",
  "Invincible: The Roleplaying Game",
  "Land of Eem",
  "Marvel Multiverse RPG",
  "Mörk Borg",
  "Mutant: Year Zero",
  "Mythic Bastionland",
  "Nimble 5e",
  "Pathfinder 2nd Edition",
  "Pirate Borg",
  "Ruins of Symbaroum",
  "Savage Worlds",
  "Shadowrun (6th/updated editions)",
  "Starfinder 2nd Edition",
  "StartPlaying",
  "Symbaroum",
  "Tales from the Loop",
  "Tales of the Valiant",
  "The Electric State Roleplaying Game",
  "The One Ring Roleplaying Game",
  "Vaesen",
  "Vampire: The Masquerade 5th Edition",
  "XYZ-Custom Campaign Codex",
];

export default function CampaignForm({ record, onChange }) {
  const { campaign } = useCampaignContext();
  
  // --------------------------------------------------
  // Campaign Packages State
  // --------------------------------------------------
  const [campaignPackages, setCampaignPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState(null);

  // --------------------------------------------------
  // Template Import Status
  // --------------------------------------------------
  const [importStatus, setImportStatus] = useState(null); // 'loading', 'success', 'error', 'warning'
  const [importMessage, setImportMessage] = useState("");

  // --------------------------------------------------
  // Guard
  // --------------------------------------------------
  if (!record) {
    return (
      <div className="cm-detail-empty">
        <h3>No Campaign Selected</h3>
        <p>Please create or select a campaign to continue.</p>
      </div>
    );
  }

  // --------------------------------------------------
  // Unified update helper
  // --------------------------------------------------
  const update = (field, value) => {
    onChange({
      ...record,
      [field]: value,
    });
  };

  // --------------------------------------------------
  // Pulse animation on record change
  // --------------------------------------------------
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [record.id]);

  // --------------------------------------------------
  // Fetch Campaign Packages
  // --------------------------------------------------
  useEffect(() => {
    async function fetchPackages() {
      console.log("[CampaignForm] Fetching campaign packages...");
      
      try {
        const res = await fetch("/api/campaign-packages");
        
        console.log("[CampaignForm] Campaign packages response status:", res.status);
        
        if (!res.ok) {
          throw new Error(`Failed to fetch packages: ${res.status} ${res.statusText}`);
        }
        
        const data = await res.json();
        console.log("[CampaignForm] Campaign packages loaded:", data);
        
        setCampaignPackages(data);
        setPackagesError(null);
        
      } catch (error) {
        console.error("[CampaignForm] Failed to load campaign packages:", error);
        setPackagesError(error.message);
        
        // Fallback to standard option
        setCampaignPackages([
          {
            value: "standard",
            label: "Standard (Blank Campaign)",
            description: "Start with an empty campaign and build it manually.",
          },
        ]);
      } finally {
        setPackagesLoading(false);
      }
    }

    fetchPackages();
  }, []);

  // --------------------------------------------------
  // Monitor template selection changes
  // --------------------------------------------------
  useEffect(() => {
    if (record.campaignPackage) {
      console.log("[CampaignForm] Template selected:", record.campaignPackage);
      
      const selectedTemplate = campaignPackages.find(
        pkg => pkg.value === record.campaignPackage
      );
      
      if (selectedTemplate) {
        console.log("[CampaignForm] Template details:", selectedTemplate);
        
        // Show info about template
        if (selectedTemplate.filename && record._isNew) {
          setImportStatus("info");
          setImportMessage(`Template "${selectedTemplate.label}" will be imported when you save.`);
        } else {
          setImportStatus(null);
          setImportMessage("");
        }
      }
    }
  }, [record.campaignPackage, campaignPackages, record._isNew]);

  // --------------------------------------------------
  // Defaults
  // --------------------------------------------------
  useEffect(() => {
    if (!record.campaignPackage) {
      update("campaignPackage", "standard");
    }
  }, [record.campaignPackage]);

  return (
    <div className="cm-detail-form">
      {/* --------------------------------------------- */}
      {/* Header */}
      {/* --------------------------------------------- */}
      <div className={`cm-campaign-header ${pulse ? "pulse" : ""}`}>
        <div className="cm-context-line">
          <strong>Campaign:</strong>{" "}
          {record._isNew
            ? "New Campaign"
            : record.name || "Unnamed Campaign"}
        </div>
      </div>

      {/* --------------------------------------------- */}
      {/* Packages Loading Error */}
      {/* --------------------------------------------- */}
      {packagesError && (
        <div className="cm-alert cm-alert-error">
          <strong>Warning:</strong> Could not load campaign templates. 
          {packagesError}
          <br />
          Only "Standard" option is available.
        </div>
      )}

      {/* --------------------------------------------- */}
      {/* Import Status Messages */}
      {/* --------------------------------------------- */}
      {importStatus && importMessage && (
        <div className={`cm-alert cm-alert-${importStatus}`}>
          {importMessage}
        </div>
      )}

      {/* --------------------------------------------- */}
      {/* Campaign Name */}
      {/* --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">Campaign Name (Required)</label>
        <input
          className="cm-input"
          value={record.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      {/* --------------------------------------------- */}
      {/* Description */}
      {/* --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">Description</label>
        <textarea
          className="cm-textarea"
          value={record.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      {/* --------------------------------------------- */}
      {/* World Setting */}
      {/* --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">World Setting</label>
        <input
          className="cm-input"
          value={record.worldSetting || ""}
          onChange={(e) => update("worldSetting", e.target.value)}
        />
      </div>

      {/* --------------------------------------------- */}
      {/* Campaign Date */}
      {/* --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">Campaign Date</label>
        <input
          type="date"
          className="cm-input"
          value={record.campaignDate || ""}
          onChange={(e) => update("campaignDate", e.target.value)}
        />
      </div>

      {/* --------------------------------------------- */}
      {/* Campaign Package - Now Dynamic! */}
      {/* --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">Campaign Template</label>
        <select
          className="cm-input"
          value={record.campaignPackage || "standard"}
          onChange={(e) => {
            console.log("[CampaignForm] User selected template:", e.target.value);
            update("campaignPackage", e.target.value);
          }}
          disabled={packagesLoading}
        >
          {packagesLoading ? (
            <option value="standard">Loading templates...</option>
          ) : (
            campaignPackages.map((pkg) => (
              <option key={pkg.value} value={pkg.value}>
                {pkg.label}
              </option>
            ))
          )}
        </select>
        
        {/* Show description of selected package */}
        {!packagesLoading && record.campaignPackage && (
          <div className="cm-field-hint">
            {campaignPackages.find(p => p.value === record.campaignPackage)?.description}
          </div>
        )}
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && record.campaignPackage !== 'standard' && (
          <div className="cm-field-hint" style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>
            <strong>Debug:</strong> Template file: {campaignPackages.find(p => p.value === record.campaignPackage)?.filename || 'none'}
          </div>
        )}
      </div>

      {/* --------------------------------------------- */}
      {/* RPG Game */}
      {/* --------------------------------------------- */}
      <div className="cm-field">
        <label className="cm-label">RPG Game</label>
        <select
          className="cm-input"
          value={record.rpgGame || ""}
          onChange={(e) => update("rpgGame", e.target.value || null)}
        >
          <option value="">Select a game…</option>
          {RPG_GAMES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {/* --------------------------------------------- */}
      {/* Debug Panel (Development Only) */}
      {/* --------------------------------------------- */}
      {process.env.NODE_ENV === 'development' && (
        <details style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Debug Info</summary>
          <pre style={{ fontSize: '11px', marginTop: '10px', overflow: 'auto' }}>
            {JSON.stringify({
              campaignPackage: record.campaignPackage,
              availablePackages: campaignPackages.length,
              packagesLoading,
              packagesError,
              selectedTemplate: campaignPackages.find(p => p.value === record.campaignPackage),
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

