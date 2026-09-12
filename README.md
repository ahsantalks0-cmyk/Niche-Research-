# Niche Research Department

**Agentic Intelligence for Niche Discovery** — a premium desktop research department
powered by a 35-agent swarm, built with Electron.

![Platform](https://img.shields.io/badge/platform-Windows-blue) ![Electron](https://img.shields.io/badge/Electron-44-brightgreen) ![Phase](https://img.shields.io/badge/phase-P0.1%20Foundation-gold)

---

## ✨ Features (Phase 0.1 — Foundation)

- **"Noir Atelier" UI** — true-black canvas with film grain, emerald × copper
  accents, masthead + floating dock navigation (no sidebar), and a refined
  light "Gallery" theme with smooth cross-fade switching and persistence
- **6 fully designed pages** — Dashboard, New Research, Niches, Reports,
  Consultant Chat, Settings (SPA navigation, zero page reloads)
- **Interactive dashboard** — animated KPI counters with sparklines, line /
  donut / bar charts (theme-aware palettes), the full 35-agent roster grouped
  by layer (Control · Discovery · Deep Research · Intelligence · QA & Reporting),
  and a recent-runs table with status pills
- **Custom frameless title bar** — min / max / close controls, drag region
- **Auto-updater** — electron-updater against GitHub Releases, in-app
  notification banner, one-click **Update Now**, live download progress with
  MB counters, percentage and ETA, restart-to-apply
- **Outfit font bundled locally** — full offline support, no CDN
- **CI/CD** — every push to `main` builds the Windows NSIS installer and
  publishes a GitHub Release (`.exe` + `latest.yml`) automatically

## 🚀 Run from source

```bash
npm install
npm start
```

> The auto-updater is disabled while running unpackaged (dev mode) — by design.

## 📦 Build the Windows installer

```bash
npm run dist:win
```

Output lands in `dist/` as `Niche Research Department-Setup-<version>.exe`.

## 🔄 Release flow

1. Bump `version` in `package.json` (e.g. `0.1.0` → `0.2.0`)
2. Commit and push to `main`
3. GitHub Actions builds the installer and publishes a `v<version>` release,
   marked **latest**
4. Installed apps detect the update on launch and offer the one-click update

The GitHub publish target (`owner`/`repo`) is injected by CI from the push
context; for local builds set `NRD_GH_OWNER` / `NRD_GH_REPO` or edit
`app.config.json`.

## 🗂 Project structure

```
├── assets/
│   ├── fonts/          # Outfit woff2 (local, offline)
│   └── icons/          # Generated gold/obsidian emblem (PNG set + ICO)
├── scripts/            # Icon generator, lint gate, dev server
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.js     # Window, IPC, lifecycle
│   │   ├── updater.js  # electron-updater engine
│   │   ├── preload.js  # Secure context bridge
│   │   ├── store.js    # Persistent settings
│   │   └── config.js   # App/publish config
│   └── renderer/
│       ├── index.html  # App shell
│       ├── styles/     # Design system (tokens, shell, components)
│       ├── js/         # Theme, router, pages, updater UI, charts
│       └── vendor/     # Chart.js (bundled)
└── .github/workflows/  # build.yml (release) + ci.yml (quality gate)
```

## 🧭 Roadmap

| Phase | Scope |
|-------|-------|
| P0.1 ✅ | Electron foundation, premium UI, auto-updater, CI/CD |
| P0.3 ✅ | SQLite database engine with 37 tables, 30 seeded countries, WAL mode |
| P0.4 ✅ | Multi-country system & 4-input mode research initiator |
| P0.5 ✅ | High-speed Browser Engine (Real Chrome, 7-Pillar Speed Architecture, CAPTCHA Safety Net, Process Isolation, Live Logs) |
| P1+ | 35-agent runtime: Discovery & Deep Research layers, Approval Gate |
| P2 | Senior Consultant chat, multi-language (English/Urdu), report engine |

---

## ⚡ Browser Engine Architecture (Phase 0.5)

The **Niche Research Department Browser Engine** is a high-speed, anti-detection web automation layer designed to deliver deep research without compromise in **under 15–20 minutes per niche**.

### 🛡 Real Chrome & Anti-Detection
- **Real Installed Chrome**: Launches with `channel: "chrome"`, using the authentic system Google Chrome binary.
- **Persistent Profile**: Operates with `launchPersistentContext` in an isolated directory (`.browser-profile`). Google trust tokens (`NID`/`SOCS`) persist across runs.
- **Authentic Headers**: Never injects fake User-Agents. Real Chrome communicates authentic `navigator.userAgentData` values.
- **Human Behavior v2 (`human.js`)**: Implements human keystroke cadence (burst typing), randomized realistic typo corrections (4% typo rate), thinking pauses, reading pauses during scrolling, and micro-mouse movement drifts.

### 🏛 The 7 Pillars of Speed
1. **Shared Page/Data Cache**: Cross-mode & cross-agent SERP/page cache in SQLite (`page_cache` table). Subsequent agents or business modes accessing identical `(keyword, country)` resolve in `<5ms`, eliminating duplicate network fetches.
2. **3-Slot Concurrency Pool**: True parallel execution across 3 independent browser contexts with overlapping task dispatches.
3. **Global Per-Domain Rate Limiter**: Process-wide token bucket prevents IP-level bot triggers across all slots and tabs (e.g. `google.com` capped at 8 req/min).
4. **Right-Sized Consolidated Delays**: Replaces stacked delay chains with single, randomized human pauses. Direct HTTP queries (RDAP, Wayback) bypass browser overhead entirely.
5. **Parallel Gemini Calls**: `geminiBatch` handles independent AI inference tasks concurrently via `Promise.all` with chunking and backoff.
6. **Multi-Country Tabs**: Multi-region niche queries run simultaneously across dedicated tabs governed by global rate limiting.
7. **Timing Instrumentation**: Every operation records millisecond-precision timestamps in `timing_logs` table, calculating aggregate duration and time saved via caching.

### 🔔 CAPTCHA Safety Net
- Detects Google "unusual traffic" challenges in real-time.
- Displays an alert banner at the top of the interface and plays a chime sound (`assets/sounds/captcha-alert.mp3`).
- Pauses only the affected browser slot while other slots continue parallel operations. Resumes automatically when resolved.

### 🔒 Multi-Department Browser Isolation Contract
- **Dedicated Directory**: Utilizes an isolated profile directory (`userData/.browser-profile`) with zero shared state.
- **Zero External Touch**: Tracks only engine-created contexts and pages via internal `WeakSet` registries (`OWNED_CONTEXTS`, `OWNED_PAGES`).
- **Never Kills External Browsers**: Never sends kill/close signals to external processes or user Chrome instances. Gracefully creates fallback profiles if a lock occurs.

---

## 📄 License

MIT

