/**
 * ============================================================================
 * YouTube-Paddy (Educational Concept) — Stable High-Performance Engine
 * ============================================================================
 * 
 * Crash-Proof & Instantaneous Ad Bypass:
 *  - Single-shot execution per ad segment (prevents call-stack floods)
 *  - High-efficiency 100ms non-blocking evaluation
 *  - Safe media timeline leap (one-time seek per ad block)
 *  - Native click dispatch on verified skip button elements only
 * 
 * ============================================================================
 */

(function () {
  'use strict';

  if (window.__PADDY_STABLE_RUNNING__) return;
  window.__PADDY_STABLE_RUNNING__ = true;

  // Configuration
  let config = {
    enabled: true,
    autoSkip: true,
    autoMute: true,
    playbackSpeed: true,
    timeJump: true,
    hideBanners: true
  };

  // State
  let isAdActive = false;
  let currentAdId = null;
  let hasJumpedCurrentAd = false;
  let savedMuted = false;
  let savedRate = 1.0;

  // Verified clickable button selectors only (no spans/text containers)
  const SKIP_BUTTON_SELECTORS = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-slot button',
    'button.ytp-ad-skip-button-modern',
    '[id^="skip-button:"] button',
    '.ytp-ad-skip-button-container button',
    'button[class*="ytp-ad-skip"]'
  ];

  // Load and sync settings
  function loadSettings() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(null, (res) => {
          if (res) config = { ...config, ...res };
        });
      }
    } catch (e) {}
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        for (const [key, val] of Object.entries(changes)) {
          if (key in config) config[key] = val.newValue;
        }
      }
    });
  }

  // Telemetry: increment skipped counter and compute saved time
  function recordAdSkipped(durationSec) {
    const validDuration = (durationSec && isFinite(durationSec) && durationSec > 0 && durationSec < 600)
      ? Math.round(durationSec)
      : 15;

    try {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'PADDY_AD_PROCESSED',
          duration: validDuration
        });
      }
    } catch (e) {}
  }

  /**
   * Generates a unique signature for consecutive commercials
   */
  function getAdSignature(player, video) {
    const adTextEl = player.querySelector('.ytp-ad-text, .ytp-ad-preview-text, .ytp-ad-simple-ad-badge');
    const textSignature = adTextEl ? adTextEl.textContent.trim() : '';
    const srcSignature = video ? (video.currentSrc || video.src || '') : '';
    const durSignature = (video && isFinite(video.duration)) ? Math.round(video.duration) : 0;
    return `${textSignature}_${durSignature}_${srcSignature.slice(-25)}`;
  }

  /**
   * Main non-blocking evaluation routine
   */
  function processPlayer() {
    if (!config.enabled) return;

    // Only run on video watch/shorts pages
    const isWatch = window.location.pathname.startsWith('/watch') || 
                    window.location.pathname.startsWith('/shorts') ||
                    window.location.pathname.startsWith('/embed');
    
    if (!isWatch) return;

    const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    const video = document.querySelector('video.html5-main-video') || document.querySelector('video');

    if (!player || !video) return;

    // Strict in-stream ad check
    const isAd = player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');

    if (isAd) {
      const adSignature = getAdSignature(player, video);

      // New ad detected in stream
      if (!isAdActive || currentAdId !== adSignature) {
        isAdActive = true;
        currentAdId = adSignature;
        hasJumpedCurrentAd = false;
        savedMuted = video.muted;
        if (video.playbackRate <= 2.0) {
          savedRate = video.playbackRate || 1.0;
        }

        recordAdSkipped(video.duration);
      }

      // 1. Auto-Mute: Instantly silence commercial audio
      if (config.autoMute && !video.muted) {
        video.muted = true;
      }

      // 2. Playback Acceleration: Speed up to 16.0x
      if (config.playbackSpeed && video.playbackRate !== 16.0) {
        try {
          video.playbackRate = 16.0;
        } catch (e) {}
      }

      // 3. Single-Shot Timeline Leap (Seek once per ad segment to prevent decoder crashes)
      if (config.timeJump && !hasJumpedCurrentAd && isFinite(video.duration) && video.duration > 0) {
        hasJumpedCurrentAd = true;
        try {
          video.currentTime = video.duration;
        } catch (e) {}
      }

      // 4. Auto-Skip: Trigger skip button if available
      if (config.autoSkip) {
        for (let i = 0; i < SKIP_BUTTON_SELECTORS.length; i++) {
          const btn = player.querySelector(SKIP_BUTTON_SELECTORS[i]);
          if (btn && btn.offsetParent !== null && typeof btn.click === 'function') {
            btn.click();
            break;
          }
        }
      }

      // Keep stream moving
      if (video.paused) {
        video.play().catch(() => {});
      }

    } else {
      // Main video playback active
      if (isAdActive) {
        isAdActive = false;
        currentAdId = null;
        hasJumpedCurrentAd = false;

        // Restore original user volume
        if (config.autoMute && savedMuted !== undefined) {
          video.muted = savedMuted;
        }

        // Restore original user playback rate
        if (config.playbackSpeed) {
          video.playbackRate = savedRate || 1.0;
        }

        // Resume main video
        if (video.paused && video.readyState >= 2) {
          video.play().catch(() => {});
        }
      }
    }
  }

  // Smooth, safe 100ms interval (instant response, zero CPU overhead, zero tab crashes)
  setInterval(processPlayer, 100);

  // Initialize
  loadSettings();

  const ver = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) 
    ? chrome.runtime.getManifest().version 
    : '1.1.1';
  console.log(`[YouTube-Paddy] v${ver} engine ready.`);
})();
