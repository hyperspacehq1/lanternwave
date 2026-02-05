/**
 * Campaign Template Mappings
 * 
 * Maps export JSON filenames to user-friendly labels for the campaign package dropdown.
 * Add new entries here when you add templates to the /imports folder.
 */

export const CAMPAIGN_TEMPLATES = {
  // Standard option (empty campaign)
  "standard": {
    label: "Standard (Blank Campaign)",
    description: "Start with an empty campaign and build it manually.",
    filename: null, // No template file
  },

  // Template campaigns (add your exported templates here)
  "msbhjvt96ngml8og8u1-campaign.json": {
    label: "Frozen Sick - D&D 5e",
    description: "A D&D 5th Edition adventure set in a frozen wilderness.",
    filename: "msbhjvt96ngml8og8u1-campaign.json",
  },

  // Add more templates below as you export them
  // "another-campaign.json": {
  //   label: "Another Campaign Name",
  //   description: "Description of this campaign template.",
  //   filename: "another-campaign.json",
  // },
};

/**
 * Get all available campaign packages as an array
 * @returns {Array} Array of campaign package options
 */
export function getCampaignPackages() {
  return Object.entries(CAMPAIGN_TEMPLATES).map(([key, value]) => ({
    value: key,
    label: value.label,
    description: value.description,
    filename: value.filename,
  }));
}

/**
 * Get a specific campaign template by key
 * @param {string} key - The template key (filename or "standard")
 * @returns {Object|null} Template info or null if not found
 */
export function getCampaignTemplate(key) {
  return CAMPAIGN_TEMPLATES[key] || null;
}

/**
 * Check if a key is a valid template
 * @param {string} key - The template key to check
 * @returns {boolean}
 */
export function isValidTemplate(key) {
  return key in CAMPAIGN_TEMPLATES;
}
