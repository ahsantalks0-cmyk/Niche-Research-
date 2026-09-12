'use strict';

/**
 * NRD · systemTests.js — System Tests Auto-Discovery & Runner (P1.3c)
 * Discovers and executes node test scripts in `scripts/test-*.js`.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function getScriptsDir() {
  // Project root is 3 levels up from src/main/engine
  const rootDir = path.resolve(__dirname, '../../..');
  const scriptsDir = path.join(rootDir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    return scriptsDir;
  }
  // Fallback to CWD
  return path.join(process.cwd(), 'scripts');
}

/**
 * Auto-discovers all test scripts in `scripts/test-*.js`.
 * @returns {Array<{ id: string, name: string, fileName: string, fullPath: string }>}
 */
function listSystemTests() {
  const dir = getScriptsDir();
  if (!fs.existsSync(dir)) return [];

  try {
    const files = fs.readdirSync(dir);
    const testFiles = files
      .filter((f) => f.startsWith('test-') && f.endsWith('.js'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    return testFiles.map((f) => {
      const id = f.replace(/\.js$/, '');
      return {
        id,
        name: f,
        fileName: f,
        fullPath: path.join(dir, f),
      };
    });
  } catch (err) {
    console.error('[systemTests] Error listing test scripts:', err);
    return [];
  }
}

/**
 * Executes a single test script in scripts/ by file name.
 * 
 * @param {string} fileName (e.g. "test-p13c.js")
 * @param {Function} [onLogChunk] Optional callback for stdout/stderr streaming
 * @returns {Promise<{ fileName: string, success: boolean, code: number, durationMs: number, output: string }>}
 */
function runSystemTest(fileName, onLogChunk) {
  return new Promise((resolve) => {
    const dir = getScriptsDir();
    const scriptPath = path.join(dir, fileName);

    if (!fs.existsSync(scriptPath)) {
      const errOutput = `[systemTests] Error: Script file not found: ${scriptPath}`;
      if (onLogChunk) onLogChunk(errOutput + '\n');
      return resolve({
        fileName,
        success: false,
        code: 1,
        durationMs: 0,
        output: errOutput,
      });
    }

    const startTime = Date.now();
    let output = '';

    const nodeExec = process.execPath.includes('electron') || process.execPath.includes('Electron')
      ? 'node'
      : process.execPath;

    const child = spawn(nodeExec, [scriptPath], {
      cwd: path.resolve(__dirname, '../../..'),
      env: { ...process.env, NODE_ENV: 'test' },
    });

    child.stdout.on('data', (chunk) => {
      const str = chunk.toString();
      output += str;
      if (typeof onLogChunk === 'function') onLogChunk(str);
    });

    child.stderr.on('data', (chunk) => {
      const str = chunk.toString();
      output += str;
      if (typeof onLogChunk === 'function') onLogChunk(str);
    });

    child.on('error', (err) => {
      const errStr = `[systemTests] Process error: ${err.message}\n`;
      output += errStr;
      if (typeof onLogChunk === 'function') onLogChunk(errStr);
    });

    child.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      resolve({
        fileName,
        passed: code === 0,
        exitCode: code || 0,
        success: code === 0,
        code: code || 0,
        durationMs,
        output,
      });
    });
  });
}

module.exports = {
  listSystemTests,
  runSystemTest,
};
