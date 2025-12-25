"use client";

import { useMemo, useRef, useState } from "react";

export default function ModuleIntegratorClient() {
  const [file, setFile] = useState(null);

  // UI states
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const xhrRef = useRef(null);

  const canSubmit = useMemo(() => {
    return !!file && !isUploading && !isProcessing;
  }, [file, isUploading, isProcessing]);

  function resetUI() {
    setIsUploading(false);
    setIsProcessing(false);
    setProgress(0);
    setStatus(null);
    setError(null);
  }

  function cancelUpload() {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setIsUploading(false);
    setIsProcessing(false);
    setProgress(0);
    setError("Upload canceled.");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setStatus(null);

    if (!file) {
      setError("Please select a PDF file.");
      return;
    }

    resetUI();

    // Build form payload
    const formData = new FormData();
    formData.append("file", file);

    // Upload with XHR to get progress events
    setIsUploading(true);
    setProgress(0);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.open("POST", "/api/admin/module-integrator", true);
    xhr.responseType = "json";

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.round((evt.loaded / evt.total) * 100);
      setProgress(pct);
    };

    xhr.onload = () => {
      setIsUploading(false);

      // Now the server is processing; XHR "load" means request completed.
      // Some servers finish quickly; we still show a "processing" stage briefly if needed.
      const ok = xhr.status >= 200 && xhr.status < 300;
      const body = xhr.response;

      if (!ok) {
        const msg =
          body?.error ||
          body?.details ||
          `Upload failed (HTTP ${xhr.status}).`;
        setIsProcessing(false);
        setProgress(0);
        setError(msg);
        return;
      }

      // Success payload expected from your route
      setIsProcessing(false);
      setProgress(100);
      setStatus(body || { success: true });
      xhrRef.current = null;
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setIsProcessing(false);
      setProgress(0);
      setError("Network error while uploading. Please try again.");
      xhrRef.current = null;
    };

    xhr.onabort = () => {
      setIsUploading(false);
      setIsProcessing(false);
      setProgress(0);
      // error message is set in cancelUpload()
      xhrRef.current = null;
    };

    // When upload completes, the server may still be doing heavy work.
    // There's no standard way to measure processing progress without SSE.
    // We show a processing spinner once upload hits 100% and request is still in flight.
    xhr.upload.onload = () => {
      // Upload finished, but request may still be processing on server.
      setIsUploading(false);
      setIsProcessing(true);
    };

    xhr.send(formData);
  }

  return (
    <div style={{ maxWidth: 980, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 54, margin: "0 0 10px" }}>Module Integrator</h1>
      <p style={{ fontSize: 24, margin: "0 0 22px" }}>
        Upload an RPG module PDF to generate an Adventure Codex.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={isUploading || isProcessing}
        />

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          Create Adventure Codex
        </button>

        {(isUploading || isProcessing) && (
          <button
            type="button"
            onClick={cancelUpload}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        )}
      </form>

      {/* Progress + spinner */}
      {(isUploading || isProcessing) && (
        <div style={{ marginTop: 18 }}>
          <StageRow
            stage={isUploading ? "Uploading…" : "Processing…"}
            progress={progress}
            showProgress={isUploading}
          />
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #a33", borderRadius: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>❌ Error</div>
          <div>{error}</div>
        </div>
      )}

      {status && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #2a6", borderRadius: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>✅ Success</div>
          <div>Adventure Codex created successfully.</div>
          {status.templateCampaignId && (
            <div style={{ marginTop: 6 }}>
              <strong>Template Campaign ID:</strong> {status.templateCampaignId}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------
   UI helpers
-------------------------------------------------- */

function StageRow({ stage, progress, showProgress }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Spinner />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{stage}</div>

        {showProgress ? (
          <>
            <div
              style={{
                height: 10,
                borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "rgba(120, 200, 255, 0.9)",
                }}
              />
            </div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
              {progress}% uploaded
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Upload complete. Creating Adventure Codex…
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <>
      <style>{`
        @keyframes lwspin { 
          0% { transform: rotate(0deg); } 
          100% { transform: rotate(360deg); } 
        }
      `}</style>
      <div
        aria-label="Loading"
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.25)",
          borderTopColor: "rgba(255,255,255,0.9)",
          animation: "lwspin 0.9s linear infinite",
        }}
      />
    </>
  );
}
