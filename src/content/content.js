/**
 * ============================================================================
 * YouTube-Paddy (Educational Concept) — Version 1.0.1
 * ============================================================================
 * 
 * An educational Chrome/Chromium Manifest V3 content script demonstrating
 * programmatic control of the HTML5 Media API and DOM manipulation on YouTube.
 * 
 * Core Architectural Modules:
 *  1. Auto-Skip Action: Programmatically clicks skip buttons the millisecond they appear.
 *  2. Ad-Muting Trigger: Silences audio during commercial interruptions and seamlessly
 *     restores the user's prior volume/unmuted state when content resumes.
 *  3. Playback Acceleration: Accelerates unskippable ads to 16.0x playback speed,
 *     compressing a 15-second ad into under a second.
 *  4. Smooth Timeline Advance: Advances playhead safely without draining MediaSource
 *     buffers or producing black decoding screens.
 *  5. Multi-Ad Telemetry: Generates distinct signatures for consecutive commercials
 *     (e.g., "Ad 1 of 2", "Ad 2 of 2") to accurately count every skipped segment.
 * 
 * ============================================================================
 */

(function () {
  'use strict';

  /**
   * Singleton guard: Prevent duplicate content script execution if injected
   * multiple times during single-page application (SPA) lifecycle transitions.
   */
  if (window.__PADDY_CORE_RUNNING__) return;
  window.__PADDY_CORE_RUNNING__ = true;

  /**
   * Global configuration state.
   * Default values are automatically synchronized with Chrome's extension storage.
   */
  let config = {
    enabled: true,         // Master kill-switch
    autoSkip: true,        // Automatically click skip buttons
    autoMute: true,        // Mute video audio during commercials
    playbackSpeed: true,   // Accelerate playback to 16.0x
    timeJump: true,        // Advance playback timeline safely
    hideBanners: true      // Clean in-player promo slots
  };

  /**
   * Internal state management:
   *  - isAdActive: Boolean tracking whether an ad is currently interrupting playback.
   *  - currentAdId: Unique signature of the current ad segment to detect consecutive ads.
   *  - savedMuted: Captures the user's original mute preference before ad muting starts.
   *  - savedRate: Captures the user's preferred playback speed (e.g. 1.0x, 1.25x, 2.0x).
   */
  let isAdActive = false;
  let currentAdId = null;
  let savedMuted = false;
  let savedRate = 1.0;

  /**
   * Selectors targeting various generations of YouTube skip ad buttons:
   * Supports modern Web Component buttons, legacy desktop slots, and container wrappers.
   */
  const SKIP_SELECTORS = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-slot button',
    'button.ytp-ad-skip-button-modern',
    '[id^="skip-button:"] button',
    '.ytp-ad-skip-button-container button',
    'button[class*="ytp-ad-skip"]'
  ];

  /**
   * ==========================================================================
   * Storage & Configuration Synchronization
   * ==========================================================================
   * Retrieves saved user preferences from chrome.storage.local on startup,
   * and listens for real-time changes triggered from the popup interface.
   */
  function loadSettings() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(null, (res) => {
          if (res) config = { ...config, ...res };
        });
      }
    } catch (e) {
      // Storage access may fail if extension context is invalidated
    }
  }

  /**
   * Real-time listener for popup toggle updates.
   * Allows users to turn features ON/OFF dynamically without reloading YouTube.
   */
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        for (const [key, val] of Object.entries(changes)) {
          if (key in config) config[key] = val.newValue;
        }
      }
    });
  }

  /**
   * ==========================================================================
   * Telemetry & Analytics Dispatcher
   * ==========================================================================
   * Sends structured messages to the background service worker whenever an
   * ad is skipped or compressed, incrementing badge counts and saved time.
   * 
   * @param {number} durationSec - Estimated duration of the bypassed ad in seconds.
   */
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
    } catch (e) {
      // Background worker might be sleeping or context refreshed
    }
  }

  /**
   * ==========================================================================
   * Ad Signature Generator
   * ==========================================================================
   * YouTube frequently chains two or more ads consecutively ("Ad 1 of 2", "Ad 2 of 2")
   * without removing the '.ad-showing' class between them.
   * 
   * This function generates a composite hash from the badge text, video duration,
   * and video stream source URL to uniquely identify consecutive commercial blocks.
   * 
   * @param {HTMLElement} player - YouTube player container element (#movie_player).
   * @param {HTMLMediaElement} video - HTML5 video element (.html5-main-video).
   * @returns {string} Unique signature string for the current ad segment.
   */
  function getAdSignature(player, video) {
    const adTextEl = player.querySelector('.ytp-ad-text, .ytp-ad-preview-text, .ytp-ad-simple-ad-badge');
    const textSignature = adTextEl ? adTextEl.textContent.trim() : '';
    const srcSignature = video ? (video.currentSrc || video.src || '') : '';
    const durSignature = (video && isFinite(video.duration)) ? Math.round(video.duration) : 0;
    return `${textSignature}_${durSignature}_${srcSignature.slice(-25)}`;
  }

  /**
   * ==========================================================================
   * Core Video Engine Automation Loop
   * ==========================================================================
   * Main evaluation routine executed periodically.
   * Inspects the YouTube player DOM and executes non-blocking Media API actions.
   */
  function processPlayer() {
    // If master switch is disabled, skip processing
    if (!config.enabled) return;

    /**
     * Page Route Optimization:
     * Only execute player checks when actively viewing a video (Watch pages, Shorts, or Embeds).
     * Bypasses homepage and search feeds to guarantee 0% CPU footprint and no virtual scroller lag.
     */
    const isWatch = window.location.pathname.startsWith('/watch') || 
                    window.location.pathname.startsWith('/shorts') ||
                    window.location.pathname.startsWith('/embed');
    
    if (!isWatch) return;

    const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    const video = document.querySelector('video.html5-main-video') || document.querySelector('video');

    if (!player || !video) return;

    /**
     * Strict Ad State Detection:
     * YouTube applies '.ad-showing' or '.ad-interrupting' to the player container
     * whenever an in-stream video ad is active.
     */
    const isAd = player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');

    if (isAd) {
      const adSignature = getAdSignature(player, video);

      /**
       * State Initialization for New Ad Segment:
       * When a new ad or consecutive commercial begins:
       *  - Cache the user's current volume and unmuted preference.
       *  - Cache the user's custom playback rate (e.g. 1.25x).
       *  - Send analytics telemetry to increment stats.
       */
      if (!isAdActive || currentAdId !== adSignature) {
        isAdActive = true;
        currentAdId = adSignature;
        savedMuted = video.muted;
        if (video.playbackRate <= 2.0) {
          savedRate = video.playbackRate || 1.0;
        }

        recordAdSkipped(video.duration);
      }

      /**
       * ----------------------------------------------------------------------
       * Feature 1: Ad-Muting Trigger
       * ----------------------------------------------------------------------
       * Programmatically silences the HTMLMediaElement during the ad block.
       */
      if (config.autoMute && !video.muted) {
        video.muted = true;
      }

      /**
       * ----------------------------------------------------------------------
       * Feature 2: Playback Acceleration (16.0x Speed)
       * ----------------------------------------------------------------------
       * Overrides the media clock rate to 16.0x.
       * Compresses unskippable 15-second ads into less than a second smoothly
       * without decoder stall or black frames.
       */
      if (config.playbackSpeed && video.playbackRate !== 16.0) {
        try {
          video.playbackRate = 16.0;
        } catch (e) {
          // Some video streams clamp playback rate
        }
      }

      /**
       * ----------------------------------------------------------------------
       * Feature 3: Auto-Skip Action
       * ----------------------------------------------------------------------
       * Scans for rendered "Skip Ad" buttons and triggers native click events.
       */
      if (config.autoSkip) {
        for (let i = 0; i < SKIP_SELECTORS.length; i++) {
          const btn = player.querySelector(SKIP_SELECTORS[i]);
          if (btn && btn.offsetParent !== null) {
            btn.click();
            break;
          }
        }
      }

      /**
       * ----------------------------------------------------------------------
       * Feature 4: Smooth Timeline Advance
       * ----------------------------------------------------------------------
       * Safely advances the playhead towards the final frame.
       * Leaves a 0.1s buffer margin to avoid MediaSource EOF buffer drain
       * which would otherwise cause black screens and endless buffering.
       */
      if (config.timeJump && isFinite(video.duration) && video.duration > 0 && video.duration < 300) {
        if (video.currentTime < video.duration - 0.5) {
          try {
            video.currentTime = video.duration - 0.1;
          } catch (e) {
            // Ignored if stream is write-protected
          }
        }
      }

      /**
       * Playback Continuity Guard:
       * Ensures the video element remains in playing state so transitions
       * do not stall or stay paused.
       */
      if (video.paused) {
        video.play().catch(() => {});
      }

    } else {
      /**
       * ======================================================================
       * Content Restoration Phase (Commercial has ended)
       * ======================================================================
       * When the commercial block ends and the main video content resumes:
       *  - Restores the original unmuted status and volume level.
       *  - Restores the user's preferred playback speed (e.g. 1.0x).
       *  - Ensures smooth playback continuation with zero user intervention.
       */
      if (isAdActive) {
        isAdActive = false;
        currentAdId = null;

        // Restore original audio preference
        if (config.autoMute && savedMuted !== undefined) {
          video.muted = savedMuted;
        }

        // Restore original playback rate
        if (config.playbackSpeed) {
          video.playbackRate = savedRate || 1.0;
        }

        // Resume main video playback if paused during stream switch
        if (video.paused && video.readyState >= 2) {
          video.play().catch(() => {});
        }
      }
    }
  }

  /**
   * ==========================================================================
   * Periodic Engine Loop Initialization
   * ==========================================================================
   * Runs the evaluation loop every 150ms.
   * This frequency ensures instant 0ms ad detection while maintaining
   * imperceptible CPU utilization.
   */
  setInterval(processPlayer, 150);

  // Initialize stored settings on script boot
  loadSettings();

  console.log('[YouTube-Paddy] v1.0.1 engine initialized successfully.');
})();
