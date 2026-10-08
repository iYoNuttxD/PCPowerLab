import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { replacementCatalog } from '../src/data/catalogReplacements.js';
import { findComponentById } from '../src/services/component.service.js';

// Independent literal source facts, never generated from runtime during a test.
const frozen = JSON.parse(readFileSync(new URL('./fixtures/replacement-technical-facts.json', import.meta.url), 'utf8'));
function assertFacts(actual, expected, path) {
  for (const [key, value] of Object.entries(expected)) {
    const label = `${path}.${key}`;
    assert.ok(actual && Object.hasOwn(actual, key), `${label} is missing`);
    if (Array.isArray(value)) assert.deepEqual([...actual[key]].sort(), [...value].sort(), label);
    else if (value && typeof value === 'object') assertFacts(actual[key], value, label);
    else assert.equal(actual[key], value, label);
  }
}
test('every replacement SKU has a frozen manufacturer-fact record with explicit source URLs', () => {
  assert.deepEqual(Object.keys(frozen.facts).sort(), replacementCatalog.map(component => component.id).sort());
  assert.equal(frozen.observedAt, '2026-10-08');
});
for (const [id, fact] of Object.entries(frozen.facts)) test(`manufacturer technical literals remain intact: ${id}`, () => {
  const component = findComponentById(id);
  assert.equal(component.partNumber, fact.partNumber);
  assert.ok(fact.sources.length > 0 && fact.sources.every(source => new URL(source).protocol === 'https:'));
  assertFacts(component.specs, fact.specs, id);
});

test('literal facts detect technical drift even when the performance formula would stay unchanged', () => {
  const cases = [
    ['ram-cmh64gx5m2b6000z30w', 'casLatency', 40],
    ['ram-cmh64gx5m2b6000z30w', 'voltageV', 1.35],
    ['ram-cmh64gx5m2b6000z30w', 'speedProfile', 'Intel XMP 2.0'],
    ['cooler-arctic-liquid-freezer-iii-pro-240-argb-white', 'totalEnvelopeThicknessMm', 63],
    ['fan-coolermaster-sickleflow-edge-120-argb-white-3-pack', 'unitsPerPack', 5],
    ['fan-coolermaster-sickleflow-edge-120-argb-white-3-pack', 'powerWatts', 10.35]
  ];
  for (const [id, field, incorrect] of cases) {
    const changed = { ...findComponentById(id).specs, [field]: incorrect };
    assert.throws(() => assertFacts(changed, frozen.facts[id].specs, id), assert.AssertionError, `${id}.${field}`);
  }
});
