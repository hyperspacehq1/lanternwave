"use client";

import { useEffect, useState } from "react";
import "./json-export.css";

/* ---------- UI primitives ---------- */

function Card({ title, children, className = "" }) {
  return (
    <div className={`rounded-xl p-4 shadow bg-white/5 border border-white/15 ${className}`}>
      <div className="text-sm font-semibold mb-3">{title}</div>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, disabled }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-white/60 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm disabled:opacity-50"
      />
    </div>
  );
}

function Select({ label, value, onChange, options, disabled }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-white/60 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm disabled:opacity-50"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ---------- Page ---------- */

export default function JsonExportPage() {
  const [tenantId, setTenantId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [isTemplate, setIsTemplate] = useState("no");
  const [templateCampaignId, setTemplateCampaignId] = useState("");
  const [campaignPackage, setCampaignPackage] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportHistory, setExportHistory] = useState([]);

  // Generate a unique ID for the export
  const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  };

  async function loadHistory() {
    try {
      const res = await fetch("/api/admin/json-export/history", {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.ok) setExportHistory(data.exports || []);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }

  async function runExport() {
    if (!tenantId || !campaignId) {
      alert("Please enter both tenant_id and campaign_id");
      return;
    }

    if (isTemplate === "yes" && (!templateCampaignId || !campaignPackage)) {
      alert("Please fill in template_campaign_id and campaign_package");
      return;
    }

    setLoading(true);
    setExportStatus({ step: "Starting export...", progress: 0 });

    try {
      const uniqueId = generateUniqueId();
      
      setExportStatus({ step: "Exporting campaign data...", progress: 10 });

      const res = await fetch("/api/admin/json-export/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          campaignId,
          isTemplate: isTemplate === "yes",
          templateCampaignId: isTemplate === "yes" ? templateCampaignId : null,
          campaignPackage: isTemplate === "yes" ? campaignPackage : null,
          uniqueId,
        }),
      });

      const data = await res.json();

      if (!data?.ok) {
        alert(data?.error || "Export failed");
        setExportStatus({ step: "Export failed", progress: 0, error: true });
        return;
      }

      setExportStatus({
        step: "Export completed successfully!",
        progress: 100,
        filename: data.filename,
        success: true,
      });

      await loadHistory();
    } catch (err) {
      console.error("Export error:", err);
      setExportStatus({ step: "Export failed", progress: 0, error: true });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTenantId("");
    setCampaignId("");
    setIsTemplate("no");
    setTemplateCampaignId("");
    setCampaignPackage("");
    setExportStatus(null);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="json-export space-y-6">
      <div className="json-export__content">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold">Campaign JSON Export</h1>
            <div className="text-sm text-white/60 mt-1">
              Export campaign data to JSON for template creation
            </div>
          </div>
        </div>

        {/* Export Form */}
        <Card title="Generate New Export Template" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tenant ID"
              value={tenantId}
              onChange={setTenantId}
              placeholder="Paste the tenant_id for the campaign"
              disabled={loading}
            />

            <Input
              label="Campaign ID"
              value={campaignId}
              onChange={setCampaignId}
              placeholder="Paste the campaign_id for the campaign"
              disabled={loading}
            />

            <Select
              label="Is Template?"
              value={isTemplate}
              onChange={setIsTemplate}
              options={[
                { value: "no", label: "NO" },
                { value: "yes", label: "YES" },
              ]}
              disabled={loading}
            />

            {isTemplate === "yes" && (
              <>
                <Input
                  label="Template Campaign ID"
                  value={templateCampaignId}
                  onChange={setTemplateCampaignId}
                  placeholder="Enter a unique template campaign ID"
                  disabled={loading}
                />

                <Input
                  label="Campaign Package"
                  value={campaignPackage}
                  onChange={setCampaignPackage}
                  placeholder="Enter the campaign package name"
                  disabled={loading}
                />
              </>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium"
              onClick={runExport}
              disabled={loading}
            >
              {loading ? "Running Export..." : "Generate Campaign Export"}
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-sm"
              onClick={resetForm}
              disabled={loading}
            >
              Reset
            </button>
          </div>
        </Card>

        {/* Export Status */}
        {exportStatus && (
          <Card
            title="Export Status"
            className={
              exportStatus.success
                ? "border-green-500/50 bg-green-500/10"
                : exportStatus.error
                ? "border-red-500/50 bg-red-500/10"
                : ""
            }
          >
            <div className="space-y-3">
              <div className="text-sm">{exportStatus.step}</div>

              {exportStatus.progress > 0 && (
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exportStatus.progress}%` }}
                  />
                </div>
              )}

              {exportStatus.filename && (
                <div className="mt-3 p-3 bg-black/30 rounded-lg">
                  <div className="text-xs text-white/60 mb-1">
                    Export Campaign Created
                  </div>
                  <div className="text-sm font-mono break-all">
                    {exportStatus.filename}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Export History */}
        {exportHistory.length > 0 && (
          <Card title="Recent Exports">
            <div className="space-y-2">
              {exportHistory.slice(0, 10).map((exp, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-black/20 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium font-mono">
                      {exp.filename}
                    </div>
                    <div className="text-xs text-white/60 mt-1">
                      {new Date(exp.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-white/60">
                    Campaign: {exp.campaign_id?.substring(0, 8)}...
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
