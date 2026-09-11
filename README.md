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
| P1+ | 35-agent runtime: Discovery & Deep Research layers, Approval Gate |
| P2 | Senior Consultant chat, multi-language (English/Urdu), report engine |

## 📄 License

MIT
