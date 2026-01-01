// /lib/campaignContext.js
import { useEffect, useState } from "react";

const STORAGE_KEY = "campaign_context";

export function getStoredCampaignContext() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export function setStoredCampaignContext(data) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useCampaignContext() {
  const [context, setContext] = useState(() => getStoredCampaignContext());

  const setCampaignContext = ({ campaign, session }) => {
    const payload = {
      campaign,
      session,
      updatedAt: Date.now(),
    };
    setStoredCampaignContext(payload);
    setContext(payload);
  };

  return {
    campaign: context?.campaign ?? null,
    session: context?.session ?? null,
    setCampaignContext,
  };
}
