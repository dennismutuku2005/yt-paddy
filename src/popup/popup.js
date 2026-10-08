/**
 * ============================================================================
 * YouTube-Paddy — Popup Hub Controller
 * ============================================================================
 * 
 * Client script for popup.html:
 *  - Loads and renders saved user preferences on popup open.
 *  - Handles user toggle interactions and persists state to chrome.storage.local.
 *  - Updates the active status badge indicator in real-time.
 *  - Displays live telemetry stats (Ads Skipped, Time Saved) with dynamic formatting.
 *  - Handles reset analytics requests with confirmation prompt.
 * 
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  /**
   * DOM Element Bindings
   */
  const masterStatusBadge = document.getElementById('masterStatusBadge');
  const masterStatusText = masterStatusBadge.querySelector('.status-text');
  
  const toggles = {
    enabled: document.getElementById('enabledToggle'),
    stealthMode: document.getElementById('stealthModeToggle'),
    autoSkip: document.getElementById('autoSkipToggle'),
    autoMute: document.getElementById('autoMuteToggle'),
    playbackSpeed: document.getElementById('playbackSpeedToggle'),
    timeJump: document.getElementById('timeJumpToggle'),
    hideBanners: document.getElementById('hideBannersToggle')
  };

  const adsSkippedVal = document.getElementById('adsSkippedVal');
  const timeSavedVal = document.getElementById('timeSavedVal');
  const resetStatsBtn = document.getElementById('resetStatsBtn');

  const versionText = document.getElementById('versionText');
  const manifest = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) 
    ? chrome.runtime.getManifest() 
    : { version: '1.2.0' };

  if (versionText) {
    versionText.textContent = `v${manifest.version} • Stealth Automation`;
  }

  /**
   * Time Formatter:
   * Converts raw cumulative seconds into human-readable strings (e.g. "4m 20s" or "45s").
   * 
   * @param {number} totalSec - Cumulative seconds saved.
   * @returns {string} Formatted duration string.
   */
  function formatTime(totalSec) {
    if (!totalSec || totalSec <= 0) return '0s';
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Status Badge State Updater:
   * Dynamically toggles active/paused visual styles on the header status pill.
   * 
   * @param {boolean} isEnabled - Whether the master engine switch is ON.
   */
  function updateStatusUI(isEnabled) {
    if (isEnabled) {
      masterStatusBadge.classList.remove('disabled');
      masterStatusText.textContent = 'Active';
    } else {
      masterStatusBadge.classList.add('disabled');
      masterStatusText.textContent = 'Paused';
    }
  }

  /**
   * Initialize UI State from Local Storage:
   * Reads all stored boolean flags and counters from chrome.storage.local.
   */
  const stored = await chrome.storage.local.get(null);

  // Apply stored toggle values
  for (const [key, element] of Object.entries(toggles)) {
    if (element) {
      element.checked = stored[key] !== undefined ? stored[key] : true;
    }
  }

  updateStatusUI(toggles.enabled.checked);

  // Render initial analytics
  const stats = stored.stats || { adsSkipped: 0, timeSavedSec: 0 };
  adsSkippedVal.textContent = stats.adsSkipped.toLocaleString();
  timeSavedVal.textContent = formatTime(stats.timeSavedSec);

  /**
   * Event Listeners for Feature Toggles:
   * Persists changes to storage immediately so content scripts update on the fly.
   */
  for (const [key, element] of Object.entries(toggles)) {
    if (element) {
      element.addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        await chrome.storage.local.set({ [key]: isChecked });

        if (key === 'enabled') {
          updateStatusUI(isChecked);
        }
      });
    }
  }

  /**
   * Reset Analytics Action:
   * Prompts the user for confirmation and dispatches a reset message to background.js.
   */
  resetStatsBtn.addEventListener('click', () => {
    if (confirm('Reset YouTube-Paddy analytics and time saved counters?')) {
      chrome.runtime.sendMessage({ type: 'PADDY_RESET_STATS' }, (response) => {
        adsSkippedVal.textContent = '0';
        timeSavedVal.textContent = '0s';
      });
    }
  });

  /**
   * Real-time Storage Observer:
   * Keeps popup statistics updated if an ad is processed while the popup remains open.
   */
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.stats) {
      const newStats = changes.stats.newValue || { adsSkipped: 0, timeSavedSec: 0 };
      adsSkippedVal.textContent = newStats.adsSkipped.toLocaleString();
      timeSavedVal.textContent = formatTime(newStats.timeSavedSec);
    }
  });
});
