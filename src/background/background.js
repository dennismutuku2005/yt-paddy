/**
 * ============================================================================
 * YouTube-Paddy (Educational Concept) — Background Service Worker
 * ============================================================================
 * 
 * Manifest V3 Service Worker responsible for:
 *  - Initializing and storing default user preferences across extension reboots.
 *  - Receiving real-time telemetry from active YouTube content scripts.
 *  - Aggregating analytics (total ads skipped, estimated cumulative time saved).
 *  - Managing extension toolbar icon badges (displaying skipped count).
 * 
 * ============================================================================
 */

try {
  importScripts('../../config/version.js');
} catch (e) {}

/**
 * Default configuration schema stored in chrome.storage.local
 */
const DEFAULT_CONFIG = {
  enabled: true,         // Master enable switch
  autoSkip: true,        // Auto-click "Skip Ad"
  autoMute: true,        // Mute video audio during commercials
  playbackSpeed: true,   // Speed up playback to 16x
  timeJump: true,        // Advance playback timeline safely
  hideBanners: true,     // Hide in-player overlay banners
  stats: {
    adsSkipped: 0,       // Total ad counter
    timeSavedSec: 0      // Cumulative time saved in seconds
  }
};

/**
 * Installation and Update Lifecycle Handler:
 * Guarantees default configuration schema is saved in persistent local storage
 * without overwriting previously accumulated statistics.
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  const current = await chrome.storage.local.get(null);
  const updated = { ...DEFAULT_CONFIG, ...current };
  if (!updated.stats) {
    updated.stats = DEFAULT_CONFIG.stats;
  }
  await chrome.storage.local.set(updated);
  console.log('[YouTube-Paddy] Background service worker initialized with configuration:', updated);
});

/**
 * Dynamic Action Badge Manager:
 * Updates the extension icon badge in the browser toolbar with the current count
 * of skipped ads. Formats counts above 999 as '999+'.
 * 
 * @param {number} count - Total number of ads skipped.
 */
async function updateBadge(count) {
  try {
    if (count > 0) {
      await chrome.action.setBadgeText({ text: count > 999 ? '999+' : `${count}` });
      await chrome.action.setBadgeBackgroundColor({ color: '#10B981' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {
    // Fails silently if tab or extension context is closed
  }
}

/**
 * Extension Message Router:
 * Listens for cross-context messages from content scripts and popup UI.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  /**
   * Action: PADDY_AD_PROCESSED
   * Dispatched by content.js when an ad is bypassed.
   * Increments the persistent ad counter and time saved stats.
   */
  if (message.type === 'PADDY_AD_PROCESSED') {
    (async () => {
      const data = await chrome.storage.local.get(['stats']);
      const currentStats = data.stats || { adsSkipped: 0, timeSavedSec: 0 };
      
      const newStats = {
        adsSkipped: currentStats.adsSkipped + 1,
        timeSavedSec: currentStats.timeSavedSec + (message.duration || 15)
      };

      await chrome.storage.local.set({ stats: newStats });
      await updateBadge(newStats.adsSkipped);
      sendResponse({ status: 'success', stats: newStats });
    })();
    return true; // Keep channel open for async response
  }

  /**
   * Action: PADDY_GET_STATS
   * Dispatched by popup.js to retrieve current analytics.
   */
  if (message.type === 'PADDY_GET_STATS') {
    chrome.storage.local.get(['stats'], (data) => {
      sendResponse(data.stats || DEFAULT_CONFIG.stats);
    });
    return true;
  }

  /**
   * Action: PADDY_RESET_STATS
   * Dispatched when user clicks "Reset Analytics" in the popup UI.
   */
  if (message.type === 'PADDY_RESET_STATS') {
    (async () => {
      await chrome.storage.local.set({ stats: { adsSkipped: 0, timeSavedSec: 0 } });
      await updateBadge(0);
      sendResponse({ status: 'reset_success' });
    })();
    return true;
  }
});
