#!/usr/bin/env node
/**
 * resolve-version.mjs — bulletproof release versioning.
 *
 * Problem it solves:
 *   electron-builder publishes a GitHub Release tagged `v{version}`. If that
 *   tag already exists (e.g. you re-run the workflow, or forgot to bump the
 *   version locally), `--publish always` fails with
 *   "release with tag vX.Y.Z already exists" — or worse, silently re-uploads
 *   onto the old release and electron-updater never shows the new build.
 *
 * How it works:
 *   1. Read the version from package.json (single source of truth).
 *   2. Collect every existing release tag: local git tags + remote tags
 *      (`git ls-remote --tags`, the full truth on GitHub) +, when
 *      NRD_KNOWN_TAGS is set, a pre-seeded list (used in tests).
 *   3. While `v{version}` is taken, bump the patch number: 0.1.0 → 0.1.1 → …
 *      After 999 patch bumps it rolls the minor: 0.1.999 → 0.2.0.
 *   4. If the version changed, rewrite package.json so electron-builder,
 *      latest.yml, the installer filename and the in-app version display all
 *      agree on the SAME number.
 *
 * Usage:
 *   node scripts/resolve-version.mjs [--dry-run]
 * Env:
 *   NRD_KNOWN_TAGS  space/comma/newline-separated tag names to treat as taken
 *                   (test hook; real runs use git + ls-remote instead)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DRY_RUN = process.argv.includes('--dry-run');
const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url));

function readVersion() {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(pkg.version || '')) {
    console.error(`✗ package.json has invalid semver: "${pkg.version}"`);
    process.exit(1);
  }
  return pkg.version;
}

function parseParts(v) {
  const [maj, min, pat] = v.split('.').map(Number);
  return { maj, min, pat };
}

/** Bump: patch++ unless patch would exceed 999 → minor++, patch=0 */
function bump(v) {
  const { maj, min, pat } = parseParts(v);
  if (pat >= 999) return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

function knownTags() {
  const tags = new Set();
  const collect = (text) => {
    for (const line of String(text).split(/\s+/)) {
      const t = line.trim();
      if (!t) continue;
      const clean = t.replace(/^refs\/tags\//, '').replace(/\^\{\}$/, '');
      if (/^v\d+\.\d+\.\d+/.test(clean)) tags.add(clean);
    }
  };

  // Pre-seeded tags (tests / manual override)
  if (process.env.NRD_KNOWN_TAGS) {
    collect(process.env.NRD_KNOWN_TAGS);
  } else {
    // Local tags
    try {
      collect(execFileSync('git', ['tag', '--list'], { encoding: 'utf8' }));
    } catch { /* not a git repo / git missing → ignore */ }
    // Remote tags — the authoritative list on GitHub
    try {
      collect(execFileSync('git', ['ls-remote', '--tags', 'origin'], { encoding: 'utf8', timeout: 30_000 }));
    } catch { /* no remote yet → local tags are the best we know */ }
  }
  return tags;
}

const base = readVersion();
const taken = knownTags();
let version = base;
let bumped = 0;
while (taken.has(`v${version}`) && bumped < 5000) {
  version = bump(version);
  bumped++;
}

if (DRY_RUN) {
  console.log(`base=${base} resolved=${version} bumps=${bumped} knownTags=${[...taken].join(',') || '(none)'}`);
  process.exit(0);
}

if (bumped > 0) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.version = version;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  console.log(`▸ Tag v${base} already exists → version auto-bumped to ${version} (skipped ${bumped} taken tag${bumped === 1 ? '' : 's'})`);
} else {
  console.log(`▸ Version ${version} is free (tag v${version} not taken) — no bump needed`);
}
console.log(`NRD_VERSION=${version}`);
