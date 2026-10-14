import { currentBuild } from './helpers/current-build.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { components } from '../src/data/components.mock.js';
import { selectBuildComponents, selectOptionalBuildComponents, serializeBuildSelection, calculateBuildPrice, allBuildComponents } from '../src/services/build.service.js';
import { checkBuildCompatibility } from '../src/services/compatibility.service.js';
import { checkCoolingCompatibility, getCoolingPower } from '../src/services/cooling.service.js';
import { analyzeBuildBottlenecks } from '../src/services/bottleneck.service.js';
import { createAdminComponent } from '../src/services/admin-component.service.js';

const selection = { cpu: 'cpu-ryzen-5-5600', motherboard: 'mb-b550m-aorus-elite', gpu: 'gpu-rtx-4060', ram: 'ram-kingston-fury-16gb-ddr4', storage: 'ssd-kingston-nv2-1tb', psu: 'psu-corsair-650w', case: 'case-mid-tower-airflow' };
const cooler = { id: 'test-v21-air', name: 'Test air cooler', category: 'cooler', price: 120, specs: { coolingType: 'air', supportedSockets: ['AM4'], heightMm: 150, powerWatts: 3 } };
const fan = { id: 'test-v21-fans', name: 'Test fan 3-pack', category: 'fan', price: 70, specs: { diameterMm: 120, thicknessMm: 25, unitsPerPack: 3, powerWatts: 2, connector: '4-pin PWM' } };
components.push(cooler, fan);
const withCooling = { ...selection, coolerId: cooler.id, fans: [{ fanId: fan.id, quantity: 2 }] };
const fixture = () => ({ cpu: { specs: { socket: 'AM4' } }, case: { specs: { maxCoolerHeightMm: 160, radiatorSizesMm: [240], maxFanThicknessMm: 25, includedFanCount: 0, fanMounts: [{ diameterMm: 120, capacity: 6 }] } }, cooler, fans: [{ ...fan, quantity: 1 }] });

test('v2.1 legacy builds retain seven slots and compatible status', () => {
  const build = selectBuildComponents(selection);
  assert.equal(Object.keys(build).length, 7);
  assert.deepEqual(serializeBuildSelection(build), selection);
  assert.equal(checkBuildCompatibility(selection).status, 'compatible');
});

test('v2.1 optional selection, serialization and pack budgets roundtrip', () => {
  const legacy = selectBuildComponents(currentBuild);
  const build = selectBuildComponents({ ...currentBuild, coolerId: cooler.id, fans: withCooling.fans });
  assert.equal(build.cooler.id, cooler.id);
  assert.equal(build.fans[0].quantity, 2);
  assert.equal(calculateBuildPrice(build), Number((calculateBuildPrice(legacy) + 120 + 2 * 70).toFixed(2)));
  assert.equal(allBuildComponents(build).length, 10);
  assert.deepEqual(selectBuildComponents({ components: serializeBuildSelection(build) }), build);
  assert.deepEqual(selectOptionalBuildComponents({ coolerId: null, fans: [] }), {});
  assert.deepEqual(selectOptionalBuildComponents({ coolerId: null, fans: null, components: { cooler: cooler.id, fans: withCooling.fans } }), {});
});

test('v2.1 rejects malformed quantity, duplicate IDs and category substitutions', () => {
  for (const quantity of [0, -1, 1.5, 21, '2', null]) {
    assert.throws(() => selectOptionalBuildComponents({ fans: [{ fanId: fan.id, quantity }] }), { statusCode: 400 });
  }
  for (const value of [42, {}, '']) assert.throws(() => selectOptionalBuildComponents({ coolerId: value }), { statusCode: 400 });
  assert.throws(() => selectOptionalBuildComponents({ fans: [withCooling.fans[0], withCooling.fans[0]] }), { statusCode: 400 });
  assert.throws(() => selectOptionalBuildComponents({ coolerId: fan.id }), { statusCode: 400 });
  assert.throws(() => selectOptionalBuildComponents({ fans: [{ fanId: cooler.id, quantity: 1 }] }), { statusCode: 400 });
});

test('v2.1 cooler socket and air-height conflicts are distinguished from missing data', () => {
  const build = fixture();
  build.cooler = { ...cooler, specs: { ...cooler.specs, supportedSockets: ['LGA1700'], heightMm: 170 } };
  const result = checkCoolingCompatibility(build);
  assert.ok(result.alerts.some((x) => x.code === 'COOLER_CPU_SOCKET_INCOMPATIBLE'));
  assert.ok(result.alerts.some((x) => x.code === 'CASE_COOLER_HEIGHT_INCOMPATIBLE'));
  build.case.specs.maxCoolerHeightMm = null;
  assert.ok(checkCoolingCompatibility(build).unverifiedChecks.some((x) => x.code === 'COOLER_HEIGHT_UNVERIFIED'));
});

test('v2.1 radiator support is checked without claiming complete physical fit', () => {
  const build = fixture();
  build.cooler = { ...cooler, specs: { coolingType: 'aio', supportedSockets: ['AM4'], radiatorSizeMm: 360, radiatorThicknessMm: 38, powerWatts: null } };
  let result = checkCoolingCompatibility(build);
  assert.ok(result.alerts.some((x) => x.code === 'CASE_RADIATOR_SIZE_INCOMPATIBLE'));
  build.cooler.specs.radiatorSizeMm = 240;
  result = checkCoolingCompatibility(build);
  assert.ok(!result.alerts.some((x) => x.code === 'CASE_RADIATOR_SIZE_INCOMPATIBLE'));
  assert.ok(result.unverifiedChecks.some((x) => x.code === 'RADIATOR_CLEARANCE_UNVERIFIED'));
  assert.ok(result.unverifiedChecks.some((x) => x.code === 'COOLING_POWER_UNVERIFIED'));
});

test('v2.1 fan diameter, thickness, included fans and radiator consume capacity', () => {
  const build = fixture();
  build.fans = [{ ...fan, quantity: 2 }];
  build.case.specs.includedFanCount = 1;
  assert.ok(checkCoolingCompatibility(build).alerts.some((x) => x.code === 'CASE_FAN_CAPACITY_EXCEEDED'));
  build.fans = [{ ...fan, specs: { ...fan.specs, diameterMm: 140, thicknessMm: 30 }, quantity: 1 }];
  const result = checkCoolingCompatibility(build);
  assert.ok(result.alerts.some((x) => x.code === 'CASE_FAN_DIAMETER_INCOMPATIBLE'));
  assert.ok(result.alerts.some((x) => x.code === 'CASE_FAN_THICKNESS_INCOMPATIBLE'));
  build.fans = [{ ...fan, quantity: 2 }];
  build.case.specs.includedFanCount = 0;
  build.cooler = { ...cooler, specs: { coolingType: 'aio', supportedSockets: ['AM4'], radiatorSizeMm: 240 } };
  assert.ok(checkCoolingCompatibility(build).alerts.some((x) => x.code === 'CASE_FAN_CAPACITY_EXCEEDED'));
});

test('v2.1 alternative mount layouts and unknown case data stay unverified', () => {
  const build = fixture();
  build.case.specs.fanMounts.push({ diameterMm: 140, capacity: 4 });
  assert.ok(checkCoolingCompatibility(build).unverifiedChecks.some((x) => x.code === 'FAN_LAYOUT_UNVERIFIED'));
  build.case.specs = {};
  assert.ok(checkCoolingCompatibility(build).unverifiedChecks.length >= 4);
  const result = checkBuildCompatibility(withCooling);
  assert.equal(result.compatible, false);
  assert.equal(result.status, 'unverified');
});

test('v2.1 physical unit power differs from pack price and never invents unknown draw', () => {
  const build = selectBuildComponents(withCooling);
  assert.deepEqual(getCoolingPower(build), { knownWatts: 15, complete: true, unknownComponents: [] });
  const before = analyzeBuildBottlenecks(selection).performanceSummary;
  const after = analyzeBuildBottlenecks(withCooling).performanceSummary;
  assert.equal(after.estimatedConsumptionWatts, before.estimatedConsumptionWatts + 15);
  assert.equal(after.cpuScore, before.cpuScore);
  assert.equal(after.powerEstimateComplete, true);
  build.cooler = { ...cooler, specs: { ...cooler.specs, powerWatts: null } };
  assert.deepEqual(getCoolingPower(build), { knownWatts: 12, complete: false, unknownComponents: [cooler.id] });
});

test('v2.1 missing storage interfaces returns unverified rather than TypeError', () => {
  const board = components.find((x) => x.id === selection.motherboard);
  const interfaces = board.specs.storageInterfaces;
  try {
    delete board.specs.storageInterfaces;
    const result = checkBuildCompatibility(selection);
    assert.equal(result.compatible, false);
    assert.ok(result.unverifiedChecks.some((x) => x.code === 'STORAGE_INTERFACE_UNVERIFIED'));
  } finally { board.specs.storageInterfaces = interfaces; }
});

test('v2.1 admin accepts cooling records with explicit unknowns and rejects malformed fields', () => {
  const result = createAdminComponent({ ...cooler, id: 'test-v21-admin-air', specs: { ...cooler.specs, powerWatts: null } });
  assert.equal(result.specs.powerWatts, null);
  const badSpecs = [{ unitsPerPack: 0 }, { diameterMm: '120' }, { thicknessMm: -2 }, { powerWatts: '2' }, { connector: {} }];
  for (const specs of badSpecs) assert.throws(() => createAdminComponent({ ...fan, id: 'invalid-fan', specs: { ...fan.specs, ...specs } }), { statusCode: 400 });
  assert.throws(() => createAdminComponent({ ...cooler, id: 'invalid-cooler', specs: { ...cooler.specs, supportedSockets: 'AM4' } }), { statusCode: 400 });
});

test('v2.1 missing legacy technical fields are unverified without false compatibility', () => {
  const fields = [['cpu', 'socket'], ['ram', 'memoryType'], ['psu', 'watts'], ['gpu', 'lengthMm'], ['case', 'supportedFormFactors']];
  for (const [slot, field] of fields) {
    const component = components.find((x) => x.id === selection[slot]);
    const old = component.specs[field];
    try {
      delete component.specs[field];
      const result = checkBuildCompatibility(selection);
      assert.equal(result.status, 'unverified');
      assert.equal(result.compatible, false);
    } finally { component.specs[field] = old; }
  }
});

test('v2.1 duplicate diameter rows do not inflate mount capacity', () => {
  const build = fixture();
  build.case.specs.fanMounts = [{ diameterMm: 120, capacity: 2 }, { diameterMm: 120, capacity: 2 }];
  assert.ok(checkCoolingCompatibility(build).alerts.some((x) => x.code === 'CASE_FAN_CAPACITY_EXCEEDED'));
});

test('v2.1 admin rejects malformed case cooling limits', () => {
  const item = components.find((x) => x.id === selection.case);
  for (const specs of [{ includedFanCount: 1.5 }, { maxCoolerHeightMm: '160' }, { radiatorSizesMm: [240, '360'] }, { fanMounts: [{ diameterMm: 120, capacity: -1 }] }]) {
    assert.throws(() => createAdminComponent({ ...item, id: 'invalid-v21-case', specs: { ...item.specs, ...specs } }), { statusCode: 400 });
  }
});
