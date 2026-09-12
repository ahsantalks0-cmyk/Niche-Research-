'use strict';

/**
 * NRD · human.js — Human Behavior Simulation Engine v2.0
 * 
 * Implements authentic organic human interaction patterns:
 * - Burst typing: common words fast (45-110ms/key), rare words slower (90-190ms)
 * - 4% typo rate: typo -> realistic pause (120-250ms) -> backspace -> correct char
 * - Thinking pauses after words, punctuation delays (300-650ms)
 * - Burst scrolling with reading pauses and occasional deep reads (1.5-3.0s)
 * - Bezier mouse movement curves with realistic overshoot and correction
 * - humanIdle(): micro hand-drift jitter during pauses
 */

const COMMON_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'best', 'top', 'review', 'buy', 'guide', 'how', 'free', 'cost', 'vs', 'near',
  'online', 'home', 'small', 'gym', 'workout', 'equipment', 'powder', 'price',
]);

// QWERTY keyboard adjacent key map for authentic typo generation
const ADJACENT_KEYS = {
  a: ['q', 'w', 's', 'z'],
  b: ['v', 'g', 'h', 'n'],
  c: ['x', 'd', 'f', 'v'],
  d: ['s', 'e', 'r', 'f', 'c', 'x'],
  e: ['w', 's', 'd', 'r'],
  f: ['d', 'r', 't', 'g', 'v', 'c'],
  g: ['f', 't', 'y', 'h', 'b', 'v'],
  h: ['g', 'y', 'u', 'j', 'n', 'b'],
  i: ['u', 'j', 'k', 'o'],
  j: ['h', 'u', 'i', 'k', 'm', 'n'],
  k: ['j', 'i', 'o', 'l', 'm'],
  l: ['k', 'o', 'p'],
  m: ['n', 'j', 'k'],
  n: ['b', 'h', 'j', 'm'],
  o: ['i', 'k', 'l', 'p'],
  p: ['o', 'l'],
  q: ['w', 'a'],
  r: ['e', 'd', 'f', 't'],
  s: ['a', 'w', 'e', 'd', 'x', 'z'],
  t: ['r', 'f', 'g', 'y'],
  u: ['y', 'h', 'j', 'i'],
  v: ['c', 'f', 'g', 'b'],
  w: ['q', 'a', 's', 'e'],
  x: ['z', 's', 'd', 'c'],
  y: ['t', 'g', 'h', 'u'],
  z: ['a', 's', 'x'],
  ' ': ['c', 'v', 'b', 'n', 'm'],
};

/**
 * Random integer between min and max inclusive.
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Promise sleep helper.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates an adjacent wrong character for typo simulation.
 * @param {string} char
 * @returns {string}
 */
function getAdjacentChar(char) {
  const lower = char.toLowerCase();
  const adj = ADJACENT_KEYS[lower];
  if (adj && adj.length > 0) {
    const picked = adj[randomBetween(0, adj.length - 1)];
    return char === char.toUpperCase() ? picked.toUpperCase() : picked;
  }
  return char;
}

/**
 * Simulates human hand drift / micro cursor jitter.
 * @param {import('playwright-core').Page} page
 * @param {number} [durationMs=200]
 */
async function humanIdle(page, durationMs = 200) {
  if (!page || typeof page.mouse?.move !== 'function') {
    await sleep(durationMs);
    return;
  }

  const steps = randomBetween(2, 4);
  const stepTime = Math.max(20, Math.floor(durationMs / steps));

  for (let i = 0; i < steps; i++) {
    const dx = randomBetween(-4, 4);
    const dy = randomBetween(-3, 3);
    try {
      // Small relative micro-motion if current pos is known, or gentle drift
      await page.mouse.move(300 + dx * i, 300 + dy * i);
    } catch {
      // Ignored if outside viewport
    }
    await sleep(stepTime);
  }
}

/**
 * Types text into an element with burst typing, thinking pauses, and 4% typo rate.
 * @param {import('playwright-core').Page} page
 * @param {string|any} selectorOrLocator
 * @param {string} text
 * @param {object} [options]
 * @param {boolean} [options.clearFirst=true]
 * @param {number} [options.typoRate=0.04]
 */
async function typeHumanLike(page, selectorOrLocator, text, options = {}) {
  const typoRate = options.typoRate !== undefined ? options.typoRate : 0.04;
  const clearFirst = options.clearFirst !== false;

  // 1. Focus or click target
  if (typeof selectorOrLocator === 'string') {
    await page.click(selectorOrLocator);
    if (clearFirst) {
      await page.fill(selectorOrLocator, '');
    }
  } else if (selectorOrLocator && typeof selectorOrLocator.click === 'function') {
    await selectorOrLocator.click();
    if (clearFirst && typeof selectorOrLocator.fill === 'function') {
      await selectorOrLocator.fill('');
    }
  }

  // Brief hesitation before typing (100 - 250ms)
  await sleep(randomBetween(100, 250));

  const words = text.split(' ');

  for (let wIndex = 0; wIndex < words.length; wIndex++) {
    const word = words[wIndex];
    const isCommon = COMMON_WORDS.has(word.toLowerCase());

    for (let cIndex = 0; cIndex < word.length; cIndex++) {
      const char = word[cIndex];

      // Typo simulation (4% probability on alphabetic chars)
      if (Math.random() < typoRate && /[a-zA-Z]/.test(char)) {
        const typoChar = getAdjacentChar(char);
        await page.keyboard.type(typoChar);

        // Pause noticing the mistake (120-250ms)
        await sleep(randomBetween(120, 250));

        // Backspace
        await page.keyboard.press('Backspace');

        // Correction pause (80-160ms)
        await sleep(randomBetween(80, 160));
      }

      // Type the authentic character
      await page.keyboard.type(char);

      // Keystroke latency: common words fast (45-110ms), rare/long slower (90-190ms)
      const keyDelay = isCommon ? randomBetween(45, 110) : randomBetween(90, 190);
      await sleep(keyDelay);

      // Punctuation delay
      if (/[.,!?;:-]/.test(char)) {
        await sleep(randomBetween(300, 650));
      }
    }

    // Between words space & thinking hesitation
    if (wIndex < words.length - 1) {
      await page.keyboard.type(' ');
      // Thinking pause between words (80 - 220ms)
      await sleep(randomBetween(80, 220));
    }
  }

  // Post-typing idle glance
  await sleep(randomBetween(150, 350));
}

/**
 * Moves mouse along a realistic curved Bezier path with overshoot and correction.
 * @param {import('playwright-core').Page} page
 * @param {number} startX
 * @param {number} startY
 * @param {number} targetX
 * @param {number} targetY
 */
async function moveMouseRealistic(page, startX, startY, targetX, targetY) {
  if (!page || !page.mouse) return;

  // Intermediate control point for cubic curve
  const dist = Math.hypot(targetX - startX, targetY - startY);
  const steps = Math.min(25, Math.max(10, Math.floor(dist / 20)));

  const midX = (startX + targetX) / 2 + randomBetween(-30, 30);
  const midY = (startY + targetY) / 2 + randomBetween(-30, 30);

  // Overshoot target slightly (4-15px)
  const angle = Math.atan2(targetY - startY, targetX - startX);
  const overshootDist = randomBetween(4, 15);
  const overX = targetX + Math.cos(angle) * overshootDist;
  const overY = targetY + Math.sin(angle) * overshootDist;

  // Move along Bezier curve to overshoot
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    // Quadratic Bezier: (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2
    const curX = Math.round((1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * overX);
    const curY = Math.round((1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * overY);
    await page.mouse.move(curX, curY);
    await sleep(randomBetween(6, 16));
  }

  // Brief hesitation at overshoot (40-100ms)
  await sleep(randomBetween(40, 100));

  // Correct back to target center
  await page.mouse.move(targetX, targetY);
  await sleep(randomBetween(30, 80));
}

/**
 * Clicks an element with mouse approach curve, overshoot, and realistic delay.
 * @param {import('playwright-core').Page} page
 * @param {string|any} selectorOrLocator
 */
async function clickHumanLike(page, selectorOrLocator) {
  if (!page) return;

  let box = null;
  if (typeof selectorOrLocator === 'string') {
    const el = await page.$(selectorOrLocator);
    if (el) box = await el.boundingBox();
  } else if (selectorOrLocator && typeof selectorOrLocator.boundingBox === 'function') {
    box = await selectorOrLocator.boundingBox();
  }

  if (box) {
    const targetX = box.x + box.width / 2 + randomBetween(-box.width * 0.2, box.width * 0.2);
    const targetY = box.y + box.height / 2 + randomBetween(-box.height * 0.2, box.height * 0.2);
    await moveMouseRealistic(page, 200, 200, targetX, targetY);
    await sleep(randomBetween(60, 180));
    await page.mouse.click(targetX, targetY);
  } else {
    // Fallback standard click
    if (typeof selectorOrLocator === 'string') {
      await page.click(selectorOrLocator);
    } else if (selectorOrLocator && typeof selectorOrLocator.click === 'function') {
      await selectorOrLocator.click();
    }
  }

  await sleep(randomBetween(100, 250));
}

/**
 * Scrolls the page in natural human bursts (1-3 quick ticks then reading pause).
 * Occasional deep-read pause (1.5-3.0s).
 * @param {import('playwright-core').Page} page
 * @param {number} [targetScrollY=600]
 */
async function scrollHumanBurst(page, targetScrollY = 600) {
  if (!page) return;

  let scrolled = 0;
  while (scrolled < targetScrollY) {
    const ticks = randomBetween(1, 3);
    for (let t = 0; t < ticks; t++) {
      const delta = randomBetween(80, 160);
      scrolled += delta;
      try {
        await page.evaluate((d) => window.scrollBy({ top: d, behavior: 'smooth' }), delta);
      } catch {
        // Page navigation or evaluation error
      }
      await sleep(randomBetween(60, 130));
    }

    // Reading pause after burst
    // ~12% chance of deep-read (1.5s - 3.0s)
    if (Math.random() < 0.12) {
      await sleep(randomBetween(1500, 3000));
    } else {
      await sleep(randomBetween(400, 900));
    }
  }
}

module.exports = {
  randomBetween,
  sleep,
  humanIdle,
  typeHumanLike,
  moveMouseRealistic,
  clickHumanLike,
  scrollHumanBurst,
};
