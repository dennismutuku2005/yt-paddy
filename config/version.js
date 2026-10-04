/**
 * ============================================================================
 * YouTube-Paddy — Centralized Version Configuration
 * ============================================================================
 * Single source of truth for version and extension metadata across all scripts.
 */

const PADDY_CONFIG = {
  version: "1.1.1",
  name: "YouTube-Paddy",
  codename: "Automation Engine",
  build: "production"
};

// Export for ES modules and Node.js environments if required
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PADDY_CONFIG;
}

// Attach to global window scope for browser environments
if (typeof window !== 'undefined') {
  window.PADDY_CONFIG = PADDY_CONFIG;
}
