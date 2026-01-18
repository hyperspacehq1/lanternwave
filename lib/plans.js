// /lib/plans.js

export const PLANS = {
  observer: {
    maxCampaigns: 3,
    storageLimitBytes: 6 * 1024 * 1024 * 1024, // 6 GB
  },

  // Future plans (not active yet, but ready)
  initiate: {
    maxCampaigns: 6,
    storageLimitBytes: 10 * 1024 * 1024 * 1024,
  },

  witness: {
    maxCampaigns: 8,
    storageLimitBytes: 15 * 1024 * 1024 * 1024,
  },

  invoker: {
    maxCampaigns: 10,
    storageLimitBytes: 20 * 1024 * 1024 * 1024,
  },

  harbinger: {
    maxCampaigns: 12,
    storageLimitBytes: 25 * 1024 * 1024 * 1024,
  },
};

/**
 * Temporary resolver.
 * Until paid plans exist, everyone is Observer.
 */
export function getCurrentPlan(/* ctx */) {
  return "observer";
}

export function getPlanLimits(plan) {
  return PLANS[plan] ?? PLANS.observer;
}
