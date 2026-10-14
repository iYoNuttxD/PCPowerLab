import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCoolingCompatibility } from '../src/services/cooling.service.js';
import { evaluateFanLayout } from '../src/services/cooling-layout.service.js';
const specs = { fanMounts: [{ diameterMm: 120, capacity: 6 }, { diameterMm: 140, capacity: 2 }], fanLayouts: { front: ['3x120'], top: ['2x120', '2x140'], rear: ['1x120'] }, radiatorLayouts: { front: [120, 240], top: [120, 140, 240, 280], rear: [120] }, radiatorSizesMm: [120, 140, 240, 280], includedFanCount: 3, includedFanDiameterMm: 120, includedFansPosition: 'front', maxFanThicknessMm: null };
const fan = (diameter, units, quantity = 1) => ({ id: `fan-${diameter}`, name: 'fan', quantity, specs: { diameterMm: diameter, thicknessMm: 25, unitsPerPack: units, powerWatts: 1 } });
const aio = (size = 240) => ({ id: 'aio', specs: { coolingType: 'aio', supportedSockets: ['AM5'], radiatorSizeMm: size, radiatorThicknessMm: 38, powerWatts: 5 } });
const build = () => ({ cpu: { specs: { socket: 'AM5' } }, case: { specs: JSON.parse(JSON.stringify(specs)) }, fans: [] });
const conflict = result => result.alerts.some(issue => issue.code === 'CASE_FAN_CAPACITY_EXCEEDED');

test('mixed alternative diameters cannot both occupy the top mounts', () => {
  const b = build(); b.fans = [fan(120, 2), fan(140, 2)];
  assert.equal(conflict(checkCoolingCompatibility(b)), true);
});
test('included fans plus a 3-pack consume all six mounts exactly once', () => {
  const b = build(); b.fans = [fan(120, 3)];
  assert.equal(conflict(checkCoolingCompatibility(b)), false);
  b.fans[0].quantity = 2;
  assert.equal(conflict(checkCoolingCompatibility(b)), true);
});
test('radiator-owned fans reserve shared mounts once, not as a second extra pack', () => {
  const b = build(); b.cooler = aio(); b.fans = [fan(120, 1)];
  const before = JSON.parse(JSON.stringify(b));
  assert.equal(conflict(checkCoolingCompatibility(b)), false);
  assert.deepEqual(b, before);
  b.fans.push(fan(140, 1));
  assert.equal(conflict(checkCoolingCompatibility(b)), true);
});
test('AIO without extra fans still checks nominal capacity and known thickness', () => {
  const b = build(); b.cooler = aio();
  b.case.specs = { fanMounts: [{ diameterMm: 120, capacity: 1 }], includedFanCount: 0, radiatorSizesMm: [240], maxRadiatorThicknessMm: 30 };
  const result = checkCoolingCompatibility(b);
  assert.equal(conflict(result), true);
  assert.ok(result.alerts.some(issue => issue.code === 'CASE_RADIATOR_THICKNESS_INCOMPATIBLE'));
  assert.ok(result.unverifiedChecks.some(issue => issue.code === 'RADIATOR_CLEARANCE_UNVERIFIED'));
});
test('missing, malformed or incomplete positional evidence remains unknown', () => {
  assert.equal(evaluateFanLayout({ ...specs, fanLayouts: null }, new Map(), null), null);
  assert.equal(evaluateFanLayout({ ...specs, fanLayouts: { top: ['2x?'] } }, new Map(), null), null);
  assert.equal(evaluateFanLayout({ ...specs, includedFanDiameterMm: null }, new Map(), null), null);
  for (const includedFansPosition of [undefined, 'missing']) {
    assert.equal(evaluateFanLayout({ ...specs, includedFansPosition }, new Map(), { diameter: 120, count: 2, size: 240 }), null);
  }
  assert.equal(evaluateFanLayout({ ...specs, radiatorLayouts: {} }, new Map(), { diameter: 120, count: 2, size: 240 }), null);
});
test('documented positions prevent claiming that a front-only radiator fits occupied front mounts', () => {
  const b = build(); b.cooler = aio(); b.case.specs.radiatorLayouts = { front: [240] };
  assert.equal(conflict(checkCoolingCompatibility(b)), true);
});
test('verified included cooler is checked without inserting a selected item', () => {
  const b = build(); b.case.specs.maxCoolerHeightMm = 60;
  b.cpu.specs.includesCpuCooler = true;
  b.cpu.specs.includedCpuCooler = { name: 'Fixture stock cooler', specSourceUrl: 'https://manufacturer.example/fixture', specs: { coolingType: 'air', supportedSockets: ['AM5'], heightMm: 70 } };
  const before = JSON.parse(JSON.stringify(b));
  assert.ok(checkCoolingCompatibility(b).alerts.some(issue => issue.code === 'CASE_COOLER_HEIGHT_INCOMPATIBLE'));
  assert.deepEqual(b, before);
  b.cooler = { id: 'short-aftermarket', specs: { coolingType: 'air', heightMm: 50, supportedSockets: ['AM5'], powerWatts: 1 } };
  assert.ok(!checkCoolingCompatibility(b).alerts.some(issue => issue.code === 'CASE_COOLER_HEIGHT_INCOMPATIBLE'));
});
