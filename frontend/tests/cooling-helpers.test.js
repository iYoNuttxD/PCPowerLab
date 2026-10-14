import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildToApiPayload, calculateBuildPrice, hydrateBuildComponents, hasCompleteBuild, normalizeSavedBuildPayload, recommendationSelection } from '../src/utils/buildHelpers.js';
import { componentTypes, catalogComponentTypes } from '../src/utils/componentLabels.js';
import { requiredWizardSteps, wizardSteps } from '../src/utils/wizardSteps.js';
import { specKeys, filterComponents, emptyCatalogFilters, formatSpecValue } from '../src/utils/componentPresentation.js';

const core = Object.fromEntries(componentTypes.map(type => [type, { id: `${type}-test`, price: 100 }]));
const cooler = { id: 'cooler-test', category: 'cooler', price: 250 };
const fan = { id: 'fan-kit', category: 'fan', price: 90, quantity: 2, specs: { unitsPerPack: 3, powerWatts: 2 } };

test('cooling has an optional stop without adding required build slots', () => {
  assert.equal(hasCompleteBuild(core), true);
  assert.equal(componentTypes.length, 7);
  assert.equal(wizardSteps.length, 10);
  assert.equal(requiredWizardSteps.length, 9);
  assert.equal(wizardSteps.includes('cooling'), true);
  assert.equal(wizardSteps.includes('cooler'), false);
  assert.equal(catalogComponentTypes.includes('cooler'), true);
  assert.equal(catalogComponentTypes.includes('fan'), true);
  assert.equal(buildToApiPayload(core).coolerId, undefined);
  assert.deepEqual(buildToApiPayload(core).fans, []);
});

test('payload carries cooler and fan packs; totals charge packs, not physical units', () => {
  const selected = { ...core, cooler, fans: [fan] };
  assert.equal(calculateBuildPrice(selected), 1130);
  const payload = buildToApiPayload(selected);
  assert.equal(payload.coolerId, cooler.id);
  assert.deepEqual(payload.fans, [{ fanId: fan.id, quantity: 2 }]);
  assert.deepEqual(buildToApiPayload({ components: payload }), payload);
  assert.deepEqual(normalizeSavedBuildPayload({ selectedComponents: selected }).components, payload);
});

test('saved, shared and local-storage representations hydrate and round-trip', () => {
  const selected = { ...core, cooler, fans: [fan] };
  const map = Object.fromEntries([...Object.values(core), cooler, fan].map(item => [item.id, item]));
  const hydrated = hydrateBuildComponents(buildToApiPayload(selected), map);
  assert.deepEqual(hydrated, selected);
  assert.deepEqual(hydrateBuildComponents(JSON.parse(JSON.stringify(selected))), selected);
  assert.equal(hydrateBuildComponents(buildToApiPayload(core)).cooler, undefined);
  assert.deepEqual(hydrateBuildComponents(buildToApiPayload(core)).fans, []);
});

test('historical objects preserve their prices and removal drops cooling payloads', () => {
  const selection = hydrateBuildComponents({ ...core, cooler: { ...cooler, price: 200 }, fans: [fan] }, { [cooler.id]: { ...cooler, price: 300 } });
  assert.equal(selection.cooler.price, 200);
  delete selection.cooler;
  delete selection.fans;
  assert.equal(calculateBuildPrice(selection), 700);
  assert.deepEqual(buildToApiPayload(selection).fans, []);
});

test('catalog filters and specification comparison include cooling without scores', () => {
  assert.deepEqual(filterComponents([cooler, fan], { ...emptyCatalogFilters, category: 'fan' }), [fan]);
  assert.ok(specKeys([fan]).includes('unitsPerPack'));
  assert.ok(specKeys([cooler]).includes('supportedSockets'));
  assert.equal(specKeys([cooler]).includes('performanceScore'), false);
  assert.equal(formatSpecValue('diameterMm', 120), '120 mm');
  assert.equal(formatSpecValue('fanMounts', [{ diameterMm: 120, capacity: 6 }]), '120 mm: até 6 ventoinha(s)');
  assert.equal(formatSpecValue('radiatorSizesMm', [120, 240]), '120 mm, 240 mm');
});


test('recommendations preserve absent cooling, explicit changes win, and full restores clear legacy cooling', () => {
  const current = { ...core, cooler, fans: [fan] };
  assert.deepEqual(recommendationSelection(current, core), current);
  assert.equal(recommendationSelection(current, { ...core, coolerId: 'new-cooler' }).cooler.id, 'new-cooler');
  assert.deepEqual(recommendationSelection(current, { ...core, fans: [] }).fans, []);
  assert.equal(recommendationSelection(current, { ...core, coolerId: null }).cooler, undefined);
  assert.equal(recommendationSelection(current, core, true).cooler, undefined);
  assert.deepEqual(recommendationSelection(current, core, true).fans, []);
});


test('missing selected cooling prices make totals unavailable instead of free', () => {
  assert.equal(calculateBuildPrice({ ...core, cooler: { ...cooler, price: null } }), null);
  assert.equal(calculateBuildPrice({ ...core, fans: [{ ...fan, price: undefined }] }), null);
  assert.equal(calculateBuildPrice({ ...core, fans: [{ ...fan, price: 0 }] }), 700);
});
