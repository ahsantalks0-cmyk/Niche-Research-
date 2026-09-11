'use strict';

const path = require('node:path');
const fs = require('node:fs');

const appRoot = path.resolve(__dirname, '..', '..');

let file = {};
try {
  file = JSON.parse(fs.readFileSync(path.join(appRoot, 'app.config.json'), 'utf8'));
} catch {
  file = {};
}

const config = {
  appName: file.app?.name || 'Niche Research Department',
  appShort: file.app?.shortName || 'NRD',
  tagline: file.app?.tagline || '',
  window: {
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    ...(file.window || {}),
  },
  github: {
    owner: file.github?.owner || '',
    repo: file.github?.repo || '',
  },
  paths: {
    root: appRoot,
    assets: path.join(appRoot, 'assets'),
  },
};

/**
 * Resolve the GitHub publish repo (owner/repo) for electron-updater.
 * Priority: app.config.json placeholders replaced by CI → env vars → null.
 * @returns {{ owner: string, repo: string } | null}
 */
function resolveGitHubRepo() {
  const gh = config.github;
  if (gh.owner && gh.repo && !gh.owner.startsWith('__')) return { owner: gh.owner, repo: gh.repo };
  if (process.env.NRD_GH_OWNER && process.env.NRD_GH_REPO) {
    return { owner: process.env.NRD_GH_OWNER, repo: process.env.NRD_GH_REPO };
  }
  return null;
}

module.exports = { config, resolveGitHubRepo };
