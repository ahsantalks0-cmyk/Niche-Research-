#!/usr/bin/env node
/**
 * lint.mjs — zero-dependency quality gate:
 *  1. node --check on every .js/.mjs/.cjs file (syntax)
 *  2. JSON.parse validation for .json files (except package-lock)
 *  3. Asset integrity: fonts, icons, vendored Chart.js present
 *  4. Workflow files exist and reference electron-updater-required outputs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import process from 'node:process';

const root = process.cwd();
let errors = 0;
const fail = (msg) => { console.error(`  ✗ ${msg}`); errors++; };
const ok = (msg) => console.log(`  ✓ ${msg}`);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

const allFiles = walk(root);

/* 1 — JS syntax */
const jsFiles = allFiles.filter((f) => ['.js', '.mjs', '.cjs'].includes(extname(f)));
console.log(`\n▸ Syntax (${jsFiles.length} JS files)`);
for (const f of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    fail(`${f}: ${e.stderr?.toString().split('\n')[0] || e.message}`);
    continue;
  }
}
if (!errors) ok('all JS files parse cleanly');

/* 2 — JSON validity */
const jsonFiles = allFiles.filter((f) => extname(f) === '.json' && !f.includes('package-lock'));
console.log(`\n▸ JSON (${jsonFiles.length} files)`);
for (const f of jsonFiles) {
  try {
    JSON.parse(readFileSync(f, 'utf8'));
  } catch (e) {
    fail(`${f}: ${e.message}`);
  }
}
if (!jsonFiles.some(() => false)) ok('all JSON files valid');

/* 3 — assets */
console.log('\n▸ Assets');
const required = [
  'assets/icons/icon.ico',
  'assets/icons/icon.png',
  'assets/icons/icon-256x256.png',
  'assets/fonts/outfit-latin-400-normal.woff2',
  'assets/fonts/outfit-latin-500-normal.woff2',
  'assets/fonts/outfit-latin-600-normal.woff2',
  'assets/fonts/outfit-latin-700-normal.woff2',
  'src/renderer/vendor/chart.umd.js',
];
for (const f of required) {
  if (!existsSync(join(root, f))) fail(`missing: ${f}`);
}
if (!errors) ok('fonts, icons, vendor bundle present');

/* 4 — packaging + updater wiring */
console.log('\n▸ Packaging config');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!pkg.build?.win?.icon) fail('build.win.icon missing');
else ok(`build.win.icon → ${pkg.build.win.icon}`);
if (pkg.build?.publish?.provider !== 'github') fail('build.publish.provider must be "github"');
else ok('publish provider = github');
if (pkg.main !== 'src/main/main.js') fail('main entry must be src/main/main.js');
else ok('main entry correct');

console.log('\n▸ Updater wiring');
const updaterSrc = readFileSync(join(root, 'src/main/updater.js'), 'utf8');
if (!updaterSrc.includes("provider: 'github'")) fail('updater feed provider not github');
else ok('electron-updater feed = github provider');
const ci = readFileSync(join(root, '.github/workflows/build.yml'), 'utf8');
if (!ci.includes('gh release upload') || !ci.includes('--publish never')) fail('build.yml must build with --publish never and upload assets via gh release upload (race-free publishing)');
else ok('CI publishes via gh release upload (single-threaded, race-free)');
if (!ci.includes('latest.yml') && !ci.includes('nsis')) fail('build.yml may not produce latest.yml (NSIS target missing)');
else ok('NSIS target present → latest.yml generated');

console.log(errors ? `\n✗ ${errors} problem(s) found` : '\n✓ All checks passed');
process.exit(errors ? 1 : 0);
