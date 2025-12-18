"use client";

import { useEffect, useState } from "react";
import CampaignForm from "@/components/forms/CampaignForm";

export default function CampaignManagerPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [active, setActive] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  /* ----------------------------
     Load campaigns
  ----------------------------- */
  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    setError("");
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(data);
      setActive(data[0] || {
        name: "",
        description: "",
        worldSetting: "",
        campaignDate: "",
        campaignPackage: "standard",
      });
    } catch (e) {
      setError(String(e));
    }
  }

  /* ----------------------------
     Save (create or update)
  ----------------------------- */
  async function save() {
    setStatus("Saving…");
    setError("");

    try {
      const payload = {
        name: active.name,
        description: active.description,
        world_setting: active.worldSetting || null,
        campaign_date: active.campaignDate || null,
        campaign_package: active.campaignPackage || "standard",
      };

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }

      if (!res.ok) {
        throw new Error(
          typeof body === "string" ? body : body.error || "Save failed"
        );
      }

      setStatus("Saved");
      await loadCampaigns();
    } catch (e) {
      setStatus("Save error");
      setError(String(e));
    }
  }

  return (
    <div className="campaign-manager">

      <div className="cm-sidebar">
        {campaigns.map((c) => (
          <div
            key={c.id}
            className="cm-list-item"
            onClick={() => setActive(c)}
          >
            {c.name}
          </div>
        ))}
      </div>

      <div className="cm-main">
        <CampaignForm record={active} onChange={setActive} />

        <div className="cm-actions">
          <button onClick={save}>Save</button>
        </div>

        {status && <div className="cm-status">{status}</div>}
        {error && (
          <pre className="cm-error">
            {error}
          </pre>
        )}
      </div>

    </div>
  );
}
