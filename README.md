# YouTube-Paddy (v1.0.1)

**YouTube-Paddy** is an educational, proof-of-concept Chrome/Chromium browser extension (Manifest V3) designed to demonstrate **browser automation**, **DOM manipulation**, and **HTML5 Video Media API programmatic control**.

---

## Core Educational Architecture

YouTube-Paddy implements four primary automation patterns to study web development, script injection, and browser media engine manipulation:

```
                  ┌─────────────────────────────────────┐
                  │      YouTube-Paddy Engine           │
                  └──────────────────┬──────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌───────────────────┐       ┌───────────────────┐       ┌───────────────────┐
│  Auto-Skip Action │       │ Ad-Muting Trigger │       │ 16x Acceleration  │
│  MutationObserver │       │ HTMLMediaElement  │       │ playbackRate=16.0 │
│  0ms click trigger│       │ .muted = true     │       │ fast-forward clock│
└───────────────────┘       └───────────────────┘       └───────────────────┘
                                     │
                                     ▼
                            ┌───────────────────┐
                            │ Timeline Jumping  │
                            │ currentTime =     │
                            │ video.duration    │
                            └───────────────────┘
```

### 1. Auto-Skip Action
* **Technique:** Continuous DOM Observation & Synthetic Pointer Event Dispatching.
* **Mechanism:** Listens via `MutationObserver` on the YouTube video container. When a skip button (e.g., `.ytp-skip-ad-button`, `.ytp-ad-skip-button-modern`, `[id^="skip-button:"] button`) mounts in the DOM, it immediately dispatches native mouse sequences (`pointerdown`, `mousedown`, `pointerup`, `mouseup`, `click`) to trigger native ad skipping instantly (0ms latency).

### 2. Ad-Muting Trigger
* **Technique:** State Caching & Audio Interception.
* **Mechanism:** Intercepts when the player enters the `.ad-showing` state, caches the user's volume preference, and sets `video.muted = true`. When the commercial finishes and main video content resumes, it restores the exact prior volume and unmuted state seamlessly.

### 3. Playback Acceleration
* **Technique:** HTML5 Media Clock Manipulation.
* **Mechanism:** For unskippable ads, overrides the browser media clock rate:
  ```javascript
  video.playbackRate = 16.0;
  ```
  Compresses a 15-second ad into under a second. Listens to `ratechange` events to prevent YouTube's internal player script from resetting playback speed.

### 4. Timeline Time-Jumping
* **Technique:** `HTMLMediaElement.currentTime` Seeking.
* **Mechanism:** Reads the duration of the commercial buffer (`video.duration`) and forces the playhead straight to the final frame (`video.currentTime = video.duration`), causing the player engine to terminate the ad block.

### 5. Declarative Banner & Promo Suppression
* **Technique:** CSS-in-JS Slot Cleansing.
* **Mechanism:** Hides companion banners, rich item promotional cards, and sponsored overlay containers via optimized declarative CSS rules (`content.css`).

---

## Project Structure

```
yt-paddy/
├── manifest.json            # Manifest V3 Extension specification
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
│   │   ├── content.js       # Core DOM & Media API automation engine
│   │   └── content.css      # Declarative banner suppression styles
│   └── popup/
│       ├── popup.html       # Glassmorphism dark-theme control hub
│       ├── popup.css        # Modern UI styling & custom toggles
│       └── popup.js         # Settings synchronization & stats telemetry
└── README.md                # Project documentation
```

---

## How to Install & Run in Chrome / Brave / Edge

1. **Open Extensions Page**:
   - In Google Chrome or Brave, navigate to `chrome://extensions/`
   - In Microsoft Edge, navigate to `edge://extensions/`
2. **Enable Developer Mode**:
   - Toggle the **Developer mode** switch in the top right corner.
3. **Load the Extension**:
   - Click the **Load unpacked** button in the top left.
   - Select this folder: `c:\Users\DENNISMUTUKU\Desktop\yt-paddy`
4. **Test on YouTube**:
   - Open [YouTube](https://www.youtube.com/) and play any video.
   - Click the **YouTube-Paddy** icon in your browser toolbar to toggle individual features and inspect real-time analytics (Ads Skipped & Time Saved).

---

## Configuration Options

| Feature | Default | Description |
| :--- | :---: | :--- |
| **Engine State** | `ON` | Master switch for all automation features |
| **Auto-Skip Action** | `ON` | Automatically triggers the "Skip Ad" button |
| **Ad-Muting Trigger** | `ON` | Silences commercials and restores volume afterwards |
| **Playback Acceleration** | `ON` | Speeds up unskippable ads at 16x |
| **Timeline Time-Jumping**| `ON` | Leaps playback head straight to the final frame |
| **Banner Suppression** | `ON` | Suppresses static feed banners and companion ads |

---

## Educational Disclaimer

*This project is developed strictly for **educational, academic, and research purposes** to demonstrate client-side DOM mutation handling, synthetic event propagation, and the HTML5 Media APIs in modern browser extension environments.*
