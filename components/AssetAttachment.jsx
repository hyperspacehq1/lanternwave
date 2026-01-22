"use client";

import { useEffect, useState } from "react";

/*
  AssetAttachment
  ------------------------------------------------------------
  Generic asset (clip) attachment for records:
  - locations
  - npcs
  - events
  - items

  READS (tenant-scoped):
    GET /api/r2/list

  WRITES (record-scoped):
    GET    /api/{entity}-image?{entity}_id=...
    POST   /api/{entity}-image
    DELETE /api/{entity}-image?{entity}_id=...

  Preview:
    /api/clips/{clip_id}
*/

export default function AssetAttachment({
  title = "Image",
  recordId,
  recordType, // "locations" | "npcs" | "events" | "items"
}) {
  const [clipId, setClipId] = useState(null);
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!recordId || !recordType) return null;

  const singular = recordType.endsWith("s")
    ? recordType.slice(0, -1)
    : recordType;

  const apiBase = `/api/${singular}-image`;
  const idParam = `${singular}_id`;

  /* ----------------------------------------------------------
     Load existing attachment
  ---------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadAttachment() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `${apiBase}?${idParam}=${recordId}`,
          { credentials: "include" }
        );

        if (!res.ok) {
          throw new Error("Failed to load attachment");
        }

        const data = await res.json();

        if (!cancelled && data?.ok) {
          setClipId(data.clip_id ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("[AssetAttachment] load attachment error", e);
          setError("Failed to load image");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAttachment();
    return () => {
      cancelled = true;
    };
  }, [apiBase, idParam, recordId]);

  /* ----------------------------------------------------------
     Load available clips (IMAGES ONLY)
     Uses existing tenant-scoped /api/r2/list
  ---------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadClips() {
      try {
        const res = await fetch("/api/r2/list", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to load clips");
        }

        const data = await res.json();

        if (!cancelled && data?.ok && Array.isArray(data.rows)) {
          const imageClips = data.rows.filter(
            (clip) =>
              typeof clip.mime_type === "string" &&
              clip.mime_type.startsWith("image/")
          );

          setClips(imageClips);
        }
      } catch (e) {
        console.error("[AssetAttachment] load clips error", e);
      }
    }

    loadClips();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ----------------------------------------------------------
     Attach clip
  ---------------------------------------------------------- */
  async function attach(newClipId) {
    if (!newClipId) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(apiBase, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [idParam]: recordId,
          clip_id: newClipId,
        }),
      });

      if (!res.ok) {
        throw new Error("Attach failed");
      }

      setClipId(newClipId);
    } catch (e) {
      console.error("[AssetAttachment] attach error", e);
      setError("Failed to attach image");
    } finally {
      setLoading(false);
    }
  }

  /* ----------------------------------------------------------
     Remove clip
  ---------------------------------------------------------- */
  async function remove() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${apiBase}?${idParam}=${recordId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) {
        throw new Error("Remove failed");
      }

      setClipId(null);
    } catch (e) {
      console.error("[AssetAttachment] remove error", e);
      setError("Failed to remove image");
    } finally {
      setLoading(false);
    }
  }

  /* ----------------------------------------------------------
     Render
  ---------------------------------------------------------- */
  return (
    <div className="cm-field">
      <label className="cm-label">{title}</label>

      {loading && <div className="cm-muted">Loading…</div>}

      {error && (
        <div className="cm-muted" style={{ color: "#c33" }}>
          {error}
        </div>
      )}

      {clipId && !loading && (
        <>
          <img
            src={`/api/clips/${clipId}`}
            alt=""
            className="cm-image-preview"
          />

          <button
            type="button"
            className="cm-btn danger"
            onClick={remove}
          >
            Remove Image
          </button>
        </>
      )}

      {!clipId && !loading && (
        <select
          className="cm-input"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              attach(e.target.value);
            }
          }}
        >
          <option value="">Select image…</option>

          {clips.map((clip) => (
            <option key={clip.id} value={clip.id}>
              {clip.title || clip.object_key}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
