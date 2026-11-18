'use strict';
// SIMULATED: fake fetch stands in for Gemini. These check OUR code only, not real Gemini output.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTranslator, validate } = require('../www/translate.js');

const answer = (t) => ({ translation: `${t}-tr`, kind: 'word', partOfSpeech: 'noun', ipa: '/x/', note: '', examples: [{ en: `A ${t}.`, translation: 'ex' }] });
const ok = (o) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(o) }] } }] }) });
const http = (status, error = {}) => ({ ok: false, status, json: async () => ({ error }) });
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), size: () => m.size }; };
const noSleep = () => Promise.resolve();
function setup(handler) {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return handler(calls.length, calls[calls.length - 1]); };
  const storage = mem();
  return { calls, storage, t: createTranslator({ fetchImpl, storage, sleep: noSleep }) };
}

test('1st request calls Gemini once and caches; 2nd (any case/spacing) is served from cache with no call', async () => {
  const { t, calls } = setup(() => ok(answer('house')));
  const a = await t.translate('House', 'fr', 'KEY'); assert.equal(a.source, 'gemini'); assert.equal(calls.length, 1);
  const b = await t.translate('  house ', 'fr', 'KEY'); assert.equal(b.source, 'cache'); assert.equal(calls.length, 1);
  assert.deepEqual(b.data, a.data);
  assert.equal((await t.translate('house', 'es', 'KEY')).source, 'gemini'); assert.equal(calls.length, 2); // other language = separate entry
});

test('cache works without a key; no key and no cache -> clear error and no call', async () => {
  const { t, calls } = setup(() => ok(answer('door')));
  await assert.rejects(() => t.translate('door', 'ar', ''), (e) => e.code === 'nokey'); assert.equal(calls.length, 0);
  await t.translate('door', 'ar', 'K');
  assert.equal((await t.translate('door', 'ar', '')).source, 'cache');
});

test('request shape: key only in header, JSON mode + schema, language + text as data', async () => {
  const { t, calls } = setup(() => ok(answer('a')));
  await t.translate('Where is the station?', 'tr', 'SECRET-KEY-123');
  const c = calls[0];
  assert.match(c.url, /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/[^/]+:generateContent$/);
  assert.equal(c.init.headers['x-goog-api-key'], 'SECRET-KEY-123');
  assert.ok(!c.url.includes('SECRET') && !c.init.body.includes('SECRET'));
  assert.equal(c.body.generationConfig.responseMimeType, 'application/json');
  assert.match(c.body.systemInstruction.parts[0].text, /Turkish/);
  assert.equal(JSON.parse(c.body.contents[0].parts[0].text).text, 'Where is the station?');
});

test('10 simultaneous identical requests -> one Gemini call', async () => {
  const { t, calls } = setup(async () => { await new Promise((r) => setTimeout(r, 30)); return ok(answer('book')); });
  await Promise.all(Array.from({ length: 10 }, () => t.translate('book', 'ar', 'K')));
  assert.equal(calls.length, 1);
});

test('errors: rejected key (400 "API key not valid" / 403), 429, 5xx, network, block, bad JSON, bad shape', async () => {
  const run = (h, extra) => { const s = setup(h); return s.t.translate('x' + Math.random(), 'ar', 'K').then(() => null, (e) => e); };
  assert.equal((await run(() => http(400, { message: 'API key not valid. Please pass a valid API key.' }))).code, 'key');
  assert.equal((await run(() => http(403))).code, 'key');
  assert.equal((await run(() => http(404))).code, 'model');
  const r429 = await run(() => http(429)); assert.equal(r429.code, 'rate'); assert.ok(r429.retryable);
  assert.equal((await run(() => http(503))).code, 'busy');
  assert.equal((await run(() => { throw new Error('offline'); })).code, 'network');
  assert.equal((await run(() => ({ ok: true, status: 200, json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }) }))).code, 'blocked');
  assert.equal((await run(() => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'nope' }] } }] }) }))).code, 'unavailable');
  assert.equal((await run(() => ok({ translation: '', kind: 'word' }))).code, 'unavailable');
});

test('rejected key is not retried; 503/429 are retried then succeed; failures are never cached', async () => {
  let s = setup(() => http(403)); await s.t.translate('a', 'ar', 'K').catch(() => {}); assert.equal(s.calls.length, 1);
  s = setup((n) => (n === 1 ? http(503) : n === 2 ? http(429) : ok(answer('a')))); assert.equal((await s.t.translate('a', 'ar', 'K')).source, 'gemini'); assert.equal(s.calls.length, 3);
  s = setup(() => http(500)); await s.t.translate('b', 'ar', 'K').catch(() => {}); assert.equal(s.storage.size(), 0);
});

test('input checks happen before any call', async () => {
  const { t, calls } = setup(() => ok(answer('a')));
  for (const [txt, lang] of [['', 'ar'], ['   ', 'ar'], ['x'.repeat(201), 'ar'], ['hi', 'de'], ['a\u0000b', 'ar']]) await assert.rejects(() => t.translate(txt, lang, 'K'), (e) => e.code === 'input');
  assert.equal(calls.length, 0);
});

test('validator whitelists fields', () => {
  assert.equal(validate({ ...answer('a'), evil: '<script>' }).evil, undefined);
  for (const bad of [null, [], {}, { translation: 'x', kind: 'banana' }, { translation: 'x', kind: 'word', examples: [1, 2, 3] }]) assert.throws(() => validate(bad));
});
