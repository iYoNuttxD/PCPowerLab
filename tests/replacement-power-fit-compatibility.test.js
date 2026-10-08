import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateResolvedBuildCompatibility as evaluate } from '../src/services/compatibility.service.js';

const revision = '2026-10-08-market-revalidation';
const part = (specs) => ({ specs });
function fixture() {
  return {
    cpu: { id: 'cpu-test', specs: { family: 'Ryzen5000', socket: 'AM4', tdpWatts: 65 } },
    motherboard: part({ socket: 'AM4', memoryType: 'DDR4', storageInterfaces: ['M.2 NVMe'], formFactor: 'mATX', memorySlots: 4, maxMemoryGb: 128 }),
    ram: part({ memoryType: 'DDR4', modulesPerKit: 2, capacityGb: 16 }),
    storage: part({ interface: 'M.2 NVMe' }),
    gpu: { catalogRevision: revision, specs: { lengthMm: 282, recommendedPsuWatts: 750, tdpWatts: null, powerConnectors: [{ type: '12v-2x6', count: 1 }] } },
    psu: part({ watts: 850, native12v2x6Connectors: 1, pcie8PinConnectors: 2 }),
    case: part({ supportedFormFactors: ['mATX'], maxGpuLengthMm: 360 })
  };
}
const has = (result, code) => [...result.alerts, ...result.unverifiedChecks].some(check => check.code === code);

test('650W without native 16-pin cannot power a 5070 by assumed adapter', () => {
  const build = fixture();
  Object.assign(build.psu.specs, { watts: 650, native12v2x6Connectors: 0, pcie8PinConnectors: 4 });
  const result = evaluate(build);
  assert.equal(result.status, 'incompatible');
  assert.ok(has(result, 'PSU_POWER_BELOW_RECOMMENDED'));
  assert.ok(has(result, 'PSU_GPU_CONNECTORS_INCOMPATIBLE'));
});

test('adequate wattage does not override known insufficient connector count', () => {
  const build = fixture();
  build.gpu.specs.powerConnectors = [{ type: 'pcie-8pin', count: 2 }];
  build.psu.specs.pcie8PinConnectors = 1;
  assert.ok(has(evaluate(build), 'PSU_GPU_CONNECTORS_INCOMPATIBLE'));
});

test('a generic PSU with unknown connectors stays unverified for an exact GPU', () => {
  const build = fixture();
  delete build.psu.specs.native12v2x6Connectors;
  const result = evaluate(build);
  assert.equal(result.status, 'unverified');
  assert.ok(has(result, 'PSU_GPU_CONNECTORS_UNVERIFIED'));
});

test('null or malformed connector counts and missing requirements are never compatible', () => {
  for (const value of [null, -1, 1.5, '1']) {
    const build = fixture();
    build.psu.specs.native12v2x6Connectors = value;
    assert.equal(evaluate(build).status, 'unverified');
  }
  for (const value of [null, [], [{ type: 'unknown', count: 1 }], [{ type: '12v-2x6', count: null }]]) {
    const build = fixture();
    build.gpu.specs.powerConnectors = value;
    assert.equal(evaluate(build).status, 'unverified');
  }
});

test('verified adequate connector counts accept recommendation check despite unknown board draw', () => {
  const result = evaluate(fixture());
  assert.equal(result.status, 'compatible');
  assert.equal(has(result, 'PSU_POWER_UNVERIFIED'), false);
});

test('duplicate requirements are summed rather than reusing the same connector', () => {
  const build = fixture();
  build.gpu.specs.powerConnectors.push({ type: '12v-2x6', count: 1 });
  assert.ok(has(evaluate(build), 'PSU_GPU_CONNECTORS_INCOMPATIBLE'));
});

test('a new motherboard with unknown installed BIOS is not socket-only compatible', () => {
  const build = fixture();
  build.motherboard.catalogRevision = revision;
  build.motherboard.specs.minimumBiosByCpu = { 'cpu-test': '2423' };
  assert.equal(evaluate(build).status, 'unverified');
  assert.ok(has(evaluate(build), 'CPU_BIOS_UNVERIFIED'));
  build.motherboard.specs.installedBiosVersion = '2400';
  assert.ok(has(evaluate(build), 'CPU_BIOS_BELOW_MINIMUM'));
  build.motherboard.specs.installedBiosVersion = '2423';
  assert.equal(evaluate(build).status, 'compatible');
  build.motherboard.specs.installedBiosVersion = '3000';
  assert.equal(evaluate(build).status, 'compatible');
});

test('BIOS family fallback works but unknown CPU support and beta versions stay unverified', () => {
  const build = fixture();
  Object.assign(build.motherboard.specs, { minimumBiosByCpu: { Ryzen5000: 'F20' }, installedBiosVersion: 'F21' });
  assert.equal(evaluate(build).status, 'compatible');
  for (const version of ['F21a', '2423', null]) {
    build.motherboard.specs.installedBiosVersion = version;
    assert.ok(has(evaluate(build), 'CPU_BIOS_UNVERIFIED'));
  }
  build.motherboard.specs.installedBiosVersion = 'F21';
  build.motherboard.specs.minimumBiosByCpu = {};
  assert.ok(has(evaluate(build), 'CPU_BIOS_UNVERIFIED'));
});

test('known PSU length or form-factor violations are incompatible', () => {
  const build = fixture();
  Object.assign(build.psu.specs, { formFactor: 'ATX', dimensionsMm: { length: 180, width: 150, height: 86 } });
  Object.assign(build.case.specs, { supportedPsuFormFactors: ['SFX'], maxPsuLengthMm: 170 });
  const result = evaluate(build);
  assert.ok(has(result, 'CASE_PSU_LENGTH_INCOMPATIBLE'));
  assert.ok(has(result, 'CASE_PSU_FORM_FACTOR_INCOMPATIBLE'));
  Object.assign(build.case.specs, { supportedPsuFormFactors: ['ATX'], maxPsuLengthMm: 180 });
  assert.equal(evaluate(build).status, 'compatible');
});

test('new PSU with unknown case dimensions never implies verified fit', () => {
  const build = fixture();
  build.psu.catalogRevision = revision;
  Object.assign(build.psu.specs, { formFactor: 'ATX', dimensionsMm: { length: 140 } });
  const result = evaluate(build);
  assert.equal(result.status, 'unverified');
  assert.ok(has(result, 'CASE_PSU_LENGTH_UNVERIFIED'));
  assert.ok(has(result, 'CASE_PSU_FORM_FACTOR_UNVERIFIED'));
});

test('historical records without new fields retain prior validation scope', () => {
  const build = fixture();
  delete build.gpu.catalogRevision;
  delete build.gpu.specs.powerConnectors;
  delete build.psu.specs.native12v2x6Connectors;
  delete build.psu.specs.pcie8PinConnectors;
  assert.equal(evaluate(build).status, 'compatible');
});


test('unlabeled dimension arrays cannot use array length as PSU millimeters', () => {
  const build = fixture();
  Object.assign(build.psu.specs, { formFactor: 'ATX', dimensionsMm: [150, 86, 150] });
  Object.assign(build.case.specs, { supportedPsuFormFactors: ['ATX'], maxPsuLengthMm: 170 });
  assert.ok(has(evaluate(build), 'CASE_PSU_LENGTH_UNVERIFIED'));
});
