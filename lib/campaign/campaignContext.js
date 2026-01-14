// /lib/campaign/campaignContext.js
import { useEffect, useState } from "react";

const STORAGE_KEY = "campaign_context";

/* ------------------------------------------------------------
   Storage helpers
------------------------------------------------------------ */
export function getStoredCampaignContext() {
  if (typeof window === "undefined") return null;

  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!raw) return null;

    // 🔒 Backward compatibility:
    // Strip legacy `session` if present
    return {
      campaign: raw.campaign ?? null,
      updatedAt: raw.updatedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export function setStoredCampaignContext(data) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ------------------------------------------------------------
   Campaign-only context hook
------------------------------------------------------------ */
export function useCampaignContext() {
  const [context, setContext] = useState(() =>
    getStoredCampaignContext()
  );

  const setCampaignContext = ({ campaign }) => {
    const payload = {
      campaign: campaign ?? null,
      updatedAt: Date.now(),
    };

    setStoredCampaignContext(payload);
    setContext(payload);
  };

  /* ----------------------------------------------------------
     Keep state in sync if localStorage changes
  ---------------------------------------------------------- */
  useEffect(() => {
    function onStorage(e) {
      if (e.key === STORAGE_KEY) {
        setContext(getStoredCampaignContext());
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return {
    campaign: context?.campaign ?? null,
    setCampaignContext,
  };
}
