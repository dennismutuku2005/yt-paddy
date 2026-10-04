/**
 * ============================================================================
 * YouTube-Paddy (Educational Concept) — Ultra-Fast Instant Skip Engine
 * ============================================================================
 * 
 * Instantaneous (0ms) DOM & HTML5 Media API Ad Bypass Engine:
 *  - Microsecond reactive MutationObserver on #movie_player
 *  - High-frequency (30ms) backup poll loop
 *  - Instant zero-latency mute & timeline completion
 *  - Synthetic pointer + click event dispatching on all skip elements
 * 
 * ============================================================================
 */

(function () {
  'use strict';

  if (window.__PADDY_FAST_ENGINE__) return;
  window.__PADDY_FAST_ENGINE__ = true;

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
  let savedMuted = false;
  let savedRate = 1.0;

  const SKIP_SELECTORS = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-slot button',
    'button.ytp-ad-skip-button-modern',
    '[id^="skip-button:"] button',
    '.ytp-ad-skip-button-container button',
    'button[class*="ytp-ad-skip"]',
    '.ytp-ad-overlay-close-button',
    '.ytp-ad-text.ytp-ad-preview-text'
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
   * Dispatches synthetic pointer & click events for instant response
   */
  function clickButton(btn) {
    if (!btn) return;
    try {
      const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
      for (let i = 0; i < events.length; i++) {
        btn.dispatchEvent(new MouseEvent(events[i], { bubbles: true, cancelable: true, view: window }));
      }
      if (typeof btn.click === 'function') btn.click();
    } catch (e) {}
  }

  /**
   * Instantaneous Ad Bypass Processing Routine
   */
  function processPlayer() {
    if (!config.enabled) return;

    const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    const video = document.querySelector('video.html5-main-video') || document.querySelector('video');

    if (!player || !video) return;

    // Strict ad-showing check
    const isAd = player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');

    if (isAd) {
      const adSignature = getAdSignature(player, video);

      // New ad detected in stream
      if (!isAdActive || currentAdId !== adSignature) {
        isAdActive = true;
        currentAdId = adSignature;
        savedMuted = video.muted;
        if (video.playbackRate <= 2.0) {
          savedRate = video.playbackRate || 1.0;
        }

        recordAdSkipped(video.duration);
      }

      // 1. Instant Auto-Mute (0ms audio silencing)
      if (config.autoMute && !video.muted) {
        video.muted = true;
      }

      // 2. Instant Playback Acceleration (16.0x Speed)
      if (config.playbackSpeed && video.playbackRate !== 16.0) {
        try {
          video.playbackRate = 16.0;
        } catch (e) {}
      }

      // 3. Instant Timeline Leap to End of Commercial
      if (config.timeJump && isFinite(video.duration) && video.duration > 0) {
        try {
          video.currentTime = video.duration;
        } catch (e) {}
      }

      // 4. Instant Click on any Rendered Skip Button
      if (config.autoSkip) {
        for (let i = 0; i < SKIP_SELECTORS.length; i++) {
          const btn = player.querySelector(SKIP_SELECTORS[i]);
          if (btn && btn.offsetParent !== null) {
            clickButton(btn);
            break;
          }
        }
      }

      // Ensure stream continues playing so it exits immediately
      if (video.paused) {
        video.play().catch(() => {});
      }

    } else {
      // Main video playback active
      if (isAdActive) {
        isAdActive = false;
        currentAdId = null;

        // Instantly restore user volume
        if (config.autoMute && savedMuted !== undefined) {
          video.muted = savedMuted;
        }

        // Instantly restore normal playback speed
        if (config.playbackSpeed) {
          video.playbackRate = savedRate || 1.0;
        }

        // Seamless resume
        if (video.paused && video.readyState >= 2) {
          video.play().catch(() => {});
        }
      }
    }
  }

  /**
   * High-Performance Microsecond Observer Setup
   * Attaches an immediate MutationObserver to #movie_player to fire the exact millisecond
   * an ad class is applied.
   */
  function initObserver() {
    const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    if (player) {
      const observer = new MutationObserver(() => {
        processPlayer();
      });
      observer.observe(player, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
  }

  // Ultra-fast 30ms polling loop (instant reaction time)
  setInterval(processPlayer, 30);

  // Initialize observer
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadSettings();
      initObserver();
    });
  } else {
    loadSettings();
    initObserver();
  }

  // Hook navigation
  window.addEventListener('yt-navigate-finish', () => {
    initObserver();
    processPlayer();
  });

  const ver = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) 
    ? chrome.runtime.getManifest().version 
    : '1.1.1';
  console.log(`[YouTube-Paddy] v${ver} instant engine active.`);
})();
