<p align="center">
  <img src="icons/icon.svg" width="120" height="120" alt="YouTube-Paddy Logo" />
</p>

<h1 align="center">YouTube-Paddy (v1.2.0)</h1>

<p align="center">
  <b>Stealth DOM Mutation Handling & HTML5 Media API Automation Engine for YouTube</b>
</p>

**YouTube-Paddy** is a high-performance, stealth-enabled Chrome/Chromium browser extension (Manifest V3) designed to demonstrate **browser automation**, **DOM manipulation**, **anti-adblock detection bypass**, and **HTML5 Video Media API programmatic control**.

## Core Architecture & Stealth Techniques

YouTube-Paddy implements multi-layered automation and evasion patterns:

```
                  ┌─────────────────────────────────────────┐
                  │      YouTube-Paddy Stealth Engine       │
                  └────────────────────┬────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
         ▼                             ▼                             ▼
┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
│ Stealth Auto-Skip   │       │ Ad-Muting Trigger   │       │ 16x Acceleration    │
│ Humanized Clicks &  │       │ HTMLMediaElement    │       │ playbackRate=16.0   │
│ Pointer Coordinates │       │ .muted = true       │       │ Fast-forward Clock  │
└─────────────────────┘       └─────────────────────┘       └─────────────────────┘
         │                             │                             │
         ▼                             ▼                             ▼
┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
│ Safe Timeline Leap  │       │ Anti-Adblock Shield │       │ Stealth CSS Bounds  │
│ Buffer-Ready Seek   │       │ Auto-Dismiss Modals │       │ Clip-path & Opacity │
│ Avoids Seek Anomaly │       │ & Auto-Unpause Video│       │ Avoids Bait Traps   │
└─────────────────────┘       └─────────────────────┘       └─────────────────────┘
```

### 1. Anti-Adblock Shield & Auto-Dismissal
* **Technique:** Enforcement Dialog Neutralization & Playback Recovery.
* **Mechanism:** Continuously detects YouTube's `ytd-enforcement-message-view-model` ("Ad blockers violate YouTube Terms of Service") and modal backdrop overlays (`tp-yt-iron-overlay-backdrop`). Automatically triggers dismiss buttons, strips blocking overlays, and unpauses video playback (`player.playVideo()` / `video.play()`).

### 2. Humanized Stealth Auto-Skip
* **Technique:** Randomized Multi-Stage Pointer & Mouse Event Synthesis.
* **Mechanism:** Dispatches `pointerdown`, `mousedown`, `pointerup`, `mouseup`, and `click` with authentic bounding box coordinates (`clientX`, `clientY`) to defeat synthetic event filters (`event.isTrusted` checks). Also integrates native `player.skipAd()` fallback.

### 3. Non-Intrusive Playback Acceleration
* **Technique:** HTML5 Media Clock Maximization.
* **Mechanism:** Speeds up ads to 16.0x speed while keeping audio silently muted (`video.muted = true`). Once the ad concludes, original user playback rate and unmuted volume are restored seamlessly.

### 4. Safe Timeline Leap
* **Technique:** Buffer-Aware Media Timeline Seeking.
* **Mechanism:** Checks `video.readyState >= 1` before leaping to `video.duration`, preventing out-of-range seek anomalies from being flagged by YouTube's watchdog telemetry.

### 5. Stealth Banner Suppression
* **Technique:** Geometric Non-Destructive Hiding.
* **Mechanism:** Uses `opacity: 0`, `pointer-events: none`, and `clip-path` instead of `display: none` on honeypot elements to avoid triggering JavaScript-based layout inspection traps (`offsetHeight === 0`).

## Project Structure

```
yt-paddy/
├── manifest.json            # Manifest V3 Extension specification (Single Source of Truth)
├── icons/
│   ├── icon.svg             # Vector master icon
│   ├── icon16.png           # 16x16 toolbar icon
│   ├── icon48.png           # 48x48 manager icon
│   ├── icon128.png          # 128x128 store/detail icon
│   └── generate_icons.js    # Standalone script for PNG generation
├── src/
│   ├── background/
│   │   └── background.js    # Service worker (Badge counter, telemetry, storage init)
│   ├── content/
│   │   ├── content.js       # Stealth DOM & Media API automation engine
│   │   └── content.css      # Non-destructive stealth suppression styles
│   └── popup/
│       ├── popup.html       # Modern dark-theme control hub with stealth toggles
│       ├── popup.css        # Clean UI styling & custom toggles
│       └── popup.js         # Settings synchronization & stats telemetry
└── README.md                # Project documentation
```

## How to Install & Run in Chrome / Brave / Edge

1. **Open Extensions Page**:
   - In Google Chrome or Brave, navigate to `chrome://extensions/`
   - In Microsoft Edge, navigate to `edge://extensions/`
2. **Enable Developer Mode**:
   - Toggle the **Developer mode** switch in the top right corner.
3. **Load the Extension**:
   - Click the **Load unpacked** button in the top left.
   - Select this folder (`yt-paddy`).
4. **Test on YouTube**:
   - Open [YouTube](https://www.youtube.com/) and play any video.
   - Click the **YouTube-Paddy** icon in your browser toolbar to toggle individual features and inspect real-time analytics (Ads Skipped & Time Saved).

## Configuration Options

| Feature | Default | Description |
| :--- | :---: | :--- |
| **Engine State** | `ON` | Master switch for all automation features |
| **Stealth Mode (Anti-Detection)** | `ON` | Auto-dismisses enforcement warnings & prevents adblock detection |
| **Stealth Auto-Skip** | `ON` | Simulates humanized clicks on "Skip Ad" buttons |
| **Ad-Muting Trigger** | `ON` | Silences commercials and restores volume afterwards |
| **Playback Acceleration** | `ON` | Speeds up unskippable ads at 16x |
| **Safe Timeline Leap**| `ON` | Safely advances playhead to final frame without telemetry trips |
| **Stealth Banner Suppression** | `ON` | Masks overlay banners without triggering honeypot detectors |

## Educational Disclaimer

*This project is developed strictly for **educational, academic, and research purposes** to demonstrate client-side DOM mutation handling, stealth synthetic event propagation and the HTML5 Media APIs in modern browser extension environments.*
