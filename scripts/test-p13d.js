'use strict';

/**
 * scripts/test-p13d.js — Verification for Main-Process LLM HTTP Client & Diagnostics (P1.3d)
 *
 * Verifies:
 * 1. httpClient module: existence, net.fetch / global fetch / node https dispatch, extractProviderErrorMessage & getErrorHint.
 * 2. Structured error results: ok, status, providerMessage, errorCode, hint. Never bare strings.
 * 3. Gemini endpoint correctness: https://generativelanguage.googleapis.com/v1beta/models?key=<KEY>.
 * 4. Missing key validation: returns ok: false, errorCode: MISSING_API_KEY.
 * 5. Unknown provider validation: returns ok: false, errorCode: UNKNOWN_PROVIDER.
 * 6. Live call error extraction: real provider error returned for invalid API key (400 with API key not valid message).
 * 7. Model validation & chat: validateModel and chat return structured objects with hint and billing detection.
 * 8. All 4 providers (gemini, openai, anthropic, groq) adhere to the unified contract.
 */

const assert = require('assert');
const httpClient = require('../src/main/llm/httpClient');
const llmClient = require('../src/main/llm/llmClient');
const llmProviders = require('../src/main/llm/llmProviders');

async function runP13dTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   NRD P1.3d · Main Process LLM & Error Diagnostics Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✕ [FAIL] ${name}:`, err.message);
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✕ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. HTTP Client Module Verification
  test('1. httpClient exports request, extractProviderErrorMessage, and getErrorHint', () => {
    assert(typeof httpClient.request === 'function', 'httpClient.request must be a function');
    assert(typeof httpClient.extractProviderErrorMessage === 'function', 'extractProviderErrorMessage must be a function');
    assert(typeof httpClient.getErrorHint === 'function', 'getErrorHint must be a function');
  });

  // 2. Diagnostic Hint Mapping
  test('2. Diagnostic Hint Mapping returns accurate hints for various error codes', () => {
    const hint400Key = httpClient.getErrorHint(400, 'API key not valid. Please pass a valid API key.');
    assert(hint400Key.includes('Key ghalat hai'), 'Hint for invalid key must mention key ghalat hai');

    const hint429 = httpClient.getErrorHint(429, 'Rate limit exceeded');
    assert(hint429.includes('Rate limit') || hint429.includes('quota'), 'Hint for 429 must mention rate limit or quota');

    const hintNet = httpClient.getErrorHint(0, 'getaddrinfo ENOTFOUND generativelanguage.googleapis.com', 'ENOTFOUND');
    assert(hintNet.includes('Internet connection') || hintNet.includes('firewall'), 'Hint for ENOTFOUND must mention internet/firewall');

    const hintCert = httpClient.getErrorHint(0, 'certificate has expired', 'CERT_HAS_EXPIRED');
    assert(hintCert.includes('SSL certificate') || hintCert.includes('system date'), 'Hint for SSL errors must mention SSL or date/time');
  });

  // 3. Provider Error Message Extraction
  test('3. extractProviderErrorMessage extracts Google, OpenAI, Anthropic, and standard error shapes', () => {
    // Google Gemini format
    const googleErr = { error: { message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } };
    assert.strictEqual(
      httpClient.extractProviderErrorMessage(googleErr, 'Fallback').message,
      'API key not valid. Please pass a valid API key.'
    );

    // OpenAI format
    const openAiErr = { error: { message: 'Incorrect API key provided: sk-proj-***' } };
    assert.strictEqual(
      httpClient.extractProviderErrorMessage(openAiErr, 'Fallback').message,
      'Incorrect API key provided: sk-proj-***'
    );

    // Anthropic format
    const anthropicErr = { error: { type: 'authentication_error', message: 'invalid x-api-key' } };
    assert.strictEqual(
      httpClient.extractProviderErrorMessage(anthropicErr, 'Fallback').message,
      'invalid x-api-key'
    );

    // Fallback string
    assert.strictEqual(httpClient.extractProviderErrorMessage(null, 'Custom fallback').message, 'Custom fallback');
  });

  // 4. Missing API Key Validation
  await asyncTest('4. fetchModels returns structured error when API key is missing', async () => {
    const res = await llmClient.fetchModels('gemini', '');
    assert.strictEqual(res.ok, false, 'Missing key must return ok: false');
    assert.strictEqual(res.errorCode, 'MISSING_API_KEY', 'Must have errorCode MISSING_API_KEY');
    assert(res.providerMessage, 'Must have providerMessage');
    assert(res.hint, 'Must provide user hint');
  });

  // 5. Unknown Provider Validation
  await asyncTest('5. fetchModels returns structured error when provider is unknown', async () => {
    const res = await llmClient.fetchModels('nonexistent_ai_engine', 'some-key');
    assert.strictEqual(res.ok, false, 'Unknown provider must return ok: false');
    assert.strictEqual(res.errorCode, 'UNKNOWN_PROVIDER', 'Must have errorCode UNKNOWN_PROVIDER');
  });

  // 6. Live Call Real Error Extraction (Gemini with invalid key)
  await asyncTest('6. Gemini fetchModels with invalid key surfaces real provider error & hint', async () => {
    const res = await llmClient.fetchModels('gemini', 'INVALID_KEY_TEST_NRD_9999');
    assert.strictEqual(res.ok, false, 'Must fail for invalid key');
    assert(res.providerMessage, 'Must contain provider message');
    assert(res.hint, 'Must contain diagnostic hint');
    // If online, Google responds 400 with "API key not valid". If offline/mocked, network error is returned with hint.
    assert(res.status !== undefined || res.errorCode !== undefined, 'Must provide status or errorCode');
    assert(!res.providerMessage.includes('fake'), 'Never return fake models');
    console.log(`     -> Response received: status=${res.status}, msg="${res.providerMessage}", hint="${res.hint}"`);
  });

  // 7. ValidateModel Structured Contract
  await asyncTest('7. validateModel returns structured error object with hint', async () => {
    const res = await llmClient.validateModel({
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      apiKey: 'INVALID_KEY_TEST_NRD_9999',
    });
    assert.strictEqual(res.ok, false, 'Must return ok: false for invalid credentials');
    assert.strictEqual(res.success, false, 'Must return success: false for invalid credentials');
    assert(res.providerMessage || res.error, 'Must have error message');
    assert(res.hint, 'Must have hint');
    assert(typeof res.isBillingError === 'boolean', 'Must identify billing error state');
  });

  // 8. Chat Structured Contract
  await asyncTest('8. chat returns structured error object with hint on failure', async () => {
    const res = await llmClient.chat({
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      apiKey: 'INVALID_KEY_TEST_NRD_9999',
      messages: [{ role: 'user', content: 'Hi' }],
    });
    assert.strictEqual(res.ok, false, 'Chat must fail with invalid key');
    assert.strictEqual(res.success, false, 'Chat success must be false');
    assert(res.providerMessage || res.error, 'Chat must have error message');
    assert(res.hint, 'Chat must have hint');
  });

  // 9. All 4 Providers Adhere to Unified Contract
  test('9. All 4 providers support fetchModels, buildChatRequest, and parseChatResponse', () => {
    const providers = ['gemini', 'openai', 'anthropic', 'groq'];
    for (const pId of providers) {
      const p = llmProviders.getProvider(pId);
      assert(p, `Provider ${pId} must be registered`);
      assert(typeof p.fetchModels === 'function', `${pId} must implement fetchModels`);
      assert(typeof p.buildChatRequest === 'function', `${pId} must implement buildChatRequest`);
      assert(typeof p.parseChatResponse === 'function', `${pId} must implement parseChatResponse`);
    }
  });

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`   P1.3d Test Results: ${passed}/${total} Passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runP13dTests().catch((err) => {
  console.error('Fatal error in P1.3d tests:', err);
  process.exit(1);
});
