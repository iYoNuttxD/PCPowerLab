import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analysisIdentity, readAnalysisSession, writeAnalysisSession, clearAnalysisSession, isRecord } from '../src/utils/analysisSession.js';

const prefix = 'pcpowerlab-analysis-session:';
const valid = value => isRecord(value) && typeof value.label === 'string';
function withStorage(t) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const entries = new Map();
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'sessionStorage', original); else delete globalThis.sessionStorage; });
  return { entries, storage };
}

test('analysis identity normalizes property order but retains all source values and array order', () => {
  assert.equal(analysisIdentity({ revision: 7, component: { id: 'gpu', price: 100 } }), analysisIdentity({ component: { price: 100, id: 'gpu' }, revision: 7 }));
  for (const value of [{ revision: 8 }, { revision: 7, component: { id: 'gpu', price: 101 } }]) {
    assert.notEqual(analysisIdentity(value), analysisIdentity({ revision: 7, component: { id: 'gpu', price: 100 } }));
  }
  assert.notEqual(analysisIdentity(['one', 'two']), analysisIdentity(['two', 'one']));
});

test('only six fixed session slots are writable, with one latest entry per slot', t => {
  const { entries } = withStorage(t);
  for (const slot of ['performance-inputs', 'performance-games', 'performance-software', 'upgrade-inputs', 'upgrade-suggestions', 'upgrade-roadmap']) {
    writeAnalysisSession(slot, 'first', { label: 'old' }, valid);
    writeAnalysisSession(slot, 'next', { label: 'new' }, valid);
    assert.deepEqual(readAnalysisSession(slot, 'next', valid), { label: 'new' });
  }
  writeAnalysisSession('arbitrary-user-data', 'next', { label: 'forbidden' }, valid);
  clearAnalysisSession('arbitrary-user-data');
  assert.equal(readAnalysisSession('arbitrary-user-data', 'next', valid), null);
  assert.equal(entries.size, 6);
  assert([...entries.keys()].every(key => key.startsWith(prefix)));
});

test('mismatched identity is removed so A→B→A cannot revive an earlier record', t => {
  const { entries } = withStorage(t);
  writeAnalysisSession('performance-games', 'A', { label: 'old' }, valid);
  assert.equal(readAnalysisSession('performance-games', 'B', valid), null);
  assert.equal(entries.size, 0);
  assert.equal(readAnalysisSession('performance-games', 'A', valid), null);
});

test('wrong version, schema, timestamp, identity and oversized snapshots are rejected and cleared', t => {
  const { entries } = withStorage(t);
  const base = { version: 1, identity: 'A', savedAt: Date.now(), value: { label: 'safe' } };
  for (const entry of [null, [], 'bad', { ...base, version: 0 }, { ...base, savedAt: 0 }, { ...base, savedAt: Date.now() + 60000 }, { ...base, savedAt: 'today' }, { ...base, value: [] }, { ...base, value: { label: {} } }, { ...base, value: { label: 'x'.repeat(400 * 1024) } }]) {
    entries.set(prefix + 'performance-games', JSON.stringify(entry));
    assert.equal(readAnalysisSession('performance-games', 'A', valid), null);
    assert.equal(entries.size, 0);
  }
  entries.set(prefix + 'performance-games', '{broken');
  assert.equal(readAnalysisSession('performance-games', 'A', valid), null);
});

test('invalid or quota-failed newer saves remove previous results', t => {
  const { entries, storage } = withStorage(t);
  writeAnalysisSession('performance-games', 'A', { label: 'old' }, valid);
  writeAnalysisSession('performance-games', 'A', { label: {} }, valid);
  assert.equal(entries.size, 0);
  writeAnalysisSession('performance-games', 'A', { label: 'old' }, valid);
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.doesNotThrow(() => writeAnalysisSession('performance-games', 'A', { label: 'new' }, valid));
  assert.equal(entries.size, 0);
});

test('denied storage access and throwing schema checks are safe fallbacks', t => {
  const { entries } = withStorage(t);
  writeAnalysisSession('performance-games', 'A', { label: 'old' }, valid);
  assert.equal(readAnalysisSession('performance-games', 'A', () => { throw new Error('Invalid shape'); }), null);
  assert.equal(entries.size, 0);
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw new Error('Denied'); } });
  assert.equal(readAnalysisSession('performance-games', 'A', valid), null);
  assert.doesNotThrow(() => writeAnalysisSession('performance-games', 'A', { label: 'new' }, valid));
  assert.doesNotThrow(() => clearAnalysisSession('performance-games'));
});
