#!/usr/bin/env node
/**
 * resolve-version.mjs — Bulletproof release versioning and collision prevention.
 *
 * Problem it solves:
 *   If a release/tag already exists on GitHub (e.g. v0.1.0, v0.1.1, v0.1.2, v0.1.3),
 *   creating a release with an existing tag either fails or skips creating the new release.
 *
 * How it works:
 *   1. Collects EVERY existing release and tag across:
 *      - GitHub Releases API (direct fetch /repos/:owner/:repo/releases)
 *      - GitHub Tags API (direct fetch /repos/:owner/:repo/tags)
 *      - GitHub CLI (`gh release list` if available)
 *      - Git remote tags (`git ls-remote --tags origin`)
 *      - Local git tags (`git tag --list`)
 *      - NRD_KNOWN_TAGS environment variable (test override)
 *   2. Extracts all semver numbers and determines the HIGHEST existing version (maxVersion).
 *   3. If maxVersion >= baseVersion (from package.json), forces the candidate to bump(maxVersion).
 *   4. While candidate tag is taken in any source, bumps the patch (or rolls minor past 999).
 *   5. Updates package.json, package-lock.json, and app.config.json to the new unique version.
 *   6. Exports NRD_VERSION and NRD_TAG to GitHub Actions environment.
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DRY_RUN = process.argv.includes('--dry-run');
const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url));
const lockPath = fileURLToPath(new URL('../package-lock.json', import.meta.url));
const configPath = fileURLToPath(new URL('../app.config.json', import.meta.url));

function readVersion() {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(pkg.version || '')) {
    console.error(`✗ package.json has invalid semver: "${pkg.version}"`);
    process.exit(1);
  }
  return pkg.version;
}

function parseParts(v) {
  const clean = String(v || '').replace(/^v/, '').trim();
  const m = clean.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return { maj: Number(m[1]), min: Number(m[2]), pat: Number(m[3]) };
}

function semverCmp(a, b) {
  if (a.maj !== b.maj) return a.maj - b.maj;
  if (a.min !== b.min) return a.min - b.min;
  return a.pat - b.pat;
}

function bump(parts) {
  if (parts.pat >= 999) return { maj: parts.maj, min: parts.min + 1, pat: 0 };
  return { maj: parts.maj, min: parts.min, pat: parts.pat + 1 };
}

function formatSemver(p) {
  return `${p.maj}.${p.min}.${p.pat}`;
}

async function collectKnownTags() {
  const tags = new Set();
  const collect = (text) => {
    if (!text) return;
    for (const item of String(text).split(/[\s,\n]+/)) {
      const t = item.trim();
      if (!t) continue;
      const clean = t.replace(/^refs\/tags\//, '').replace(/\^\{\}$/, '');
      if (/^v?\d+\.\d+\.\d+/.test(clean)) {
        tags.add(clean.startsWith('v') ? clean : `v${clean}`);
      }
    }
  };

  // 1. Env hook (for tests / manual override)
  if (process.env.NRD_KNOWN_TAGS) {
    collect(process.env.NRD_KNOWN_TAGS);
    return tags;
  }

  // Resolve repository coordinates
  let owner = 'ahsantalks0-cmyk';
  let repo = 'Niche-Research-';
  if (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY.includes('/')) {
    [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
  } else if (existsSync(configPath)) {
    try {
      const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
      if (cfg.github?.owner && cfg.github?.repo) {
        owner = cfg.github.owner;
        repo = cfg.github.repo;
      }
    } catch { /* ignore */ }
  }

  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const headers = {
    'User-Agent': 'NRD-Release-Resolver',
    'Accept': 'application/vnd.github+json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // 2. Direct GitHub API Releases query
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`, { headers });
    if (res.ok) {
      const releases = await res.json();
      if (Array.isArray(releases)) {
        for (const r of releases) {
          if (r.tag_name) collect(r.tag_name);
          if (r.name && /^v?\d+\.\d+\.\d+/.test(r.name)) collect(r.name);
        }
      }
    } else {
      console.warn(`[resolve-version] GitHub Releases API returned status ${res.status}`);
    }
  } catch (err) {
    console.warn('[resolve-version] GitHub Releases API query error:', err.message);
  }

  // 3. Direct GitHub API Tags query
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=100`, { headers });
    if (res.ok) {
      const apiTags = await res.json();
      if (Array.isArray(apiTags)) {
        for (const t of apiTags) {
          if (t.name) collect(t.name);
        }
      }
    }
  } catch { /* ignore */ }

  // 4. GitHub CLI (if available in runner environment)
  try {
    const out = execFileSync('gh', ['release', 'list', '--repo', `${owner}/${repo}`, '--limit', '1000', '--json', 'tagName', '-q', '.[].tagName'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 15_000,
    });
    collect(out);
  } catch { /* gh not present or not logged in */ }

  // 5. Remote git tags via git ls-remote
  try {
    const out = execFileSync('git', ['ls-remote', '--tags', 'origin'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 25_000,
    });
    collect(out);
  } catch { /* remote unreachable */ }

  // 6. Local git tags
  try {
    const out = execFileSync('git', ['tag', '--list'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    collect(out);
  } catch { /* not in git repo */ }

  return tags;
}

async function run() {
  const baseStr = readVersion();
  const baseSemver = parseParts(baseStr);
  const taken = await collectKnownTags();

  // Find highest existing semver across all known releases/tags
  let maxSemver = null;
  for (const tag of taken) {
    const parsed = parseParts(tag);
    if (!parsed) continue;
    if (!maxSemver || semverCmp(parsed, maxSemver) > 0) {
      maxSemver = parsed;
    }
  }

  // If existing releases/tags exist that are >= base, force candidate to start after maxSemver
  let candidate = baseSemver;
  if (maxSemver && semverCmp(maxSemver, baseSemver) >= 0) {
    candidate = bump(maxSemver);
  }

  // Ensure candidate tag is completely free
  let bumped = 0;
  while ((taken.has(`v${formatSemver(candidate)}`) || taken.has(formatSemver(candidate))) && bumped < 5000) {
    candidate = bump(candidate);
    bumped++;
  }

  const version = formatSemver(candidate);
  const tag = `v${version}`;

  console.log(`▸ Base package version:     ${baseStr}`);
  console.log(`▸ Highest existing release:  ${maxSemver ? 'v' + formatSemver(maxSemver) : '(none)'}`);
  console.log(`▸ Total existing tags seen:  ${taken.size} (${[...taken].sort().join(', ') || 'none'})`);
  console.log(`▸ Target new release version: ${version} (Tag: ${tag})`);

  if (DRY_RUN) {
    console.log(`[dry-run] base=${baseStr} max=${maxSemver ? formatSemver(maxSemver) : 'none'} resolved=${version}`);
    process.exit(0);
  }

  // Update package.json
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.version = version;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

  // Update package-lock.json version fields if present
  if (existsSync(lockPath)) {
    try {
      const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
      lock.version = version;
      if (lock.packages && lock.packages['']) {
        lock.packages[''].version = version;
      }
      writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
    } catch { /* ignore lock update error */ }
  }

  // Update app.config.json if present
  if (existsSync(configPath)) {
    try {
      const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
      if (cfg.app) {
        cfg.app.version = version;
        writeFileSync(configPath, `${JSON.stringify(cfg, null, 2)}\n`, 'utf8');
      }
    } catch { /* ignore config update error */ }
  }

  // Export to GitHub Actions environment
  if (process.env.GITHUB_ENV) {
    try {
      appendFileSync(process.env.GITHUB_ENV, `NRD_VERSION=${version}\nNRD_TAG=${tag}\n`, 'utf8');
    } catch { /* ignore */ }
  }
  if (process.env.GITHUB_OUTPUT) {
    try {
      appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\ntag=${tag}\n`, 'utf8');
    } catch { /* ignore */ }
  }

  console.log(`NRD_VERSION=${version}`);
  console.log(`NRD_TAG=${tag}`);
}

run().catch((err) => {
  console.error('✗ Failed to resolve version:', err);
  process.exit(1);
});
