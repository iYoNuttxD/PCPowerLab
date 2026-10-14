import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  COOLING_MODEL_VERSION,
  DEFAULT_COOLING_CONDITIONS,
  coolingComponentIdentity,
  coolingSimulationSignatures,
  normalizeCoolingConditions,
  simulateCooling
} from '../src/utils/coolingSimulation.js';
import frozenScope from '../src/data/cooling-model/active-model-scope.json' with { type: 'json' };
import manifest from '../src/data/cooling-model/model-manifest.json' with { type: 'json' };
import cpuLedger from '../src/data/cooling-model/cpu-priors.json' with { type: 'json' };
import coolerLedger from '../src/data/cooling-model/cooler-priors.json' with { type: 'json' };
import acousticLedger from '../src/data/cooling-model/acoustic-priors.json' with { type: 'json' };

const clone = value => structuredClone(value);
const rows = frozenScope.map(row => manifest.identityCorrections.filter(fix => fix.componentId === row.id)
  .reduce((result, fix) => ({ ...result, [fix.field]: fix.canonicalValue }), row));
const component = id => clone(rows.find(row => row.id === id));
const cpu = component('cpu-intel-i7-13700k');
const cooler = component('cooler-bequiet-pure-rock-3-black');
const fan = component('fan-arctic-p12-pro');
const kit = component('fan-coolermaster-sickleflow-edge-120-argb-white-3-pack');
const allCpus = rows.filter(row => row.category === 'cpu');
const allCoolers = rows.filter(row => row.category === 'cooler');
const allFans = rows.filter(row => row.category === 'fan');
const bounds = ['low', 'central', 'high'];
const simulate = overrides => simulateCooling({ cpu, cooler, ...overrides });
const sustained = result => result.thermal.scenarioBands.at(-1);
const near = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const ordered = band => assert.ok(band.low <= band.central && band.central <= band.high);

// Numerical regression cases independently reproduced in the frozen r3 review.
const thermalCases = [
  ['cpu-ryzen-5-5500', 'cooler-bequiet-pure-rock-3-black', 65, 0.75, 25, [39.3, 52.3, 67.25]],
  ['cpu-intel-i7-13700k', 'cooler-bequiet-pure-rock-3-black', 253, 1, 25, [75.6, 126.936, 192.026]],
  ['cpu-intel-i7-13700k', 'cooler-bequiet-pure-rock-pro3-black', 125, 1, 25, [43.75, 62.5, 90]],
  ['cpu-intel-i7-13700k', 'cooler-arctic-liquid-freezer-iii-pro-360', 125, 1, 25, [43.75, 63.75, 88.75]],
  ['cpu-intel-i7-13700k', 'cooler-bequiet-pure-rock-3-black', 190, 1, 23, [61, 95.2, 133.2]]
];

test('the four numerical/scope ledgers retain their reviewed r3 byte hashes', () => {
  for (const entry of manifest.originalLedgerFiles) {
    const buffer = readFileSync(new URL(`../src/data/cooling-model/${entry.file}`, import.meta.url));
    assert.equal(createHash('sha256').update(buffer).digest('hex'), entry.sha256, entry.file);
  }
  assert.equal(manifest.profileRevision, 'r3-shared-anchor-reproducibility');
  assert.equal(cpuLedger.sharedPackagePrior.id, coolerLedger.packageAnchor.profileId);
  for (const bound of bounds) assert.equal(cpuLedger.sharedPackagePrior[bound], coolerLedger.packageAnchor[bound]);
});

test('default conditions are explicit, immutable, and preserve automatic nominal reference power', () => {
  assert.deepEqual(normalizeCoolingConditions(), { valid: true, conditions: DEFAULT_COOLING_CONDITIONS, errors: [] });
  assert.deepEqual(DEFAULT_COOLING_CONDITIONS, {
    inletCelsius: 25, coolerSpeedFraction: 0.75, extraFanSpeedFraction: 0.75,
    referenceHeatWatts: null, modelVersion: COOLING_MODEL_VERSION
  });
  assert.ok(Object.isFrozen(DEFAULT_COOLING_CONDITIONS));
  assert.ok(Object.isFrozen(normalizeCoolingConditions({ inletCelsius: 20 }).conditions));
  assert.equal(simulate().thermal.referenceHeatWatts, 125); // Never silently use 253 W turbo.
  assert.equal(simulate().thermal.referenceHeatKind, 'nominal-power-scenario');
});

test('strict condition validation rejects text, empty, nonfinite, old-version, and unknown inputs', () => {
  for (const value of [null, [], false, 3, '', '25']) assert.equal(normalizeCoolingConditions(value).valid, false);
  for (const key of ['inletCelsius', 'coolerSpeedFraction', 'extraFanSpeedFraction', 'referenceHeatWatts']) {
    for (const value of ['25', '', undefined, NaN, Infinity, -Infinity, false, {}, []]) {
      const result = normalizeCoolingConditions({ [key]: value });
      assert.equal(result.valid, false, `${key}=${String(value)}`);
      assert.equal(result.conditions, null);
      assert.ok(result.errors.some(error => error.field === key));
    }
  }
  for (const key of ['inletCelsius', 'coolerSpeedFraction', 'extraFanSpeedFraction']) assert.equal(normalizeCoolingConditions({ [key]: null }).valid, false);
  assert.equal(normalizeCoolingConditions({ referenceHeatWatts: null }).valid, true);
  assert.equal(normalizeCoolingConditions({ modelVersion: 'older-model' }).errors[0].code, 'unsupported-model-version');
  assert.equal(normalizeCoolingConditions({ pwmFraction: 0.75 }).errors[0].code, 'unknown-condition');
});

test('domain boundaries are inclusive; requests outside them are not silently clamped', () => {
  for (const [key, min, max] of [['inletCelsius', 15, 35], ['coolerSpeedFraction', 0.5, 1], ['extraFanSpeedFraction', 0.5, 1], ['referenceHeatWatts', 5, 300]]) {
    for (const value of [min, max]) assert.equal(normalizeCoolingConditions({ [key]: value }).valid, true);
    for (const value of [min - 0.001, max + 0.001]) {
      const result = simulate({ conditions: { [key]: value } });
      assert.equal(result.validConditions, false);
      if (key === 'extraFanSpeedFraction') assert.deepEqual(result.thermal, simulate().thermal);
      else {
        assert.equal(result.thermal.status, 'out-of-domain');
        assert.equal(result.thermal.outOfDomain, true);
        assert.deepEqual(result.thermal.scenarioBands, []);
      }
      if (key === 'coolerSpeedFraction') assert.equal(result.acoustics.bandDba, null);
      else assert.deepEqual(result.acoustics.bandDba, simulate().acoustics.bandDba);
      assert.ok(result.conditionsErrors.some(error => error.field === key && error.code === 'out-of-domain'));
    }
  }
});

test('invalid acoustic-only speeds never change thermal output or its signature', () => {
  for (const selectedCpu of allCpus) for (const selectedCooler of allCoolers) {
    const base = { cpu: selectedCpu, cooler: selectedCooler, fans: [{ ...fan, quantity: 1 }] };
    const expected = simulateCooling(base);
    for (const extraFanSpeedFraction of [0.49, 1.01, null, undefined, '', '0.75', NaN]) {
      const result = simulateCooling({ ...base, conditions: { extraFanSpeedFraction } });
      assert.deepEqual(result.thermal, expected.thermal);
      assert.equal(result.signatures.thermal, expected.signatures.thermal);
      assert.equal(result.validConditions, false);
      assert.equal(result.acoustics.coverage, 'partial');
      assert.deepEqual(result.acoustics.bandDba, simulateCooling({ cpu: selectedCpu, cooler: selectedCooler }).acoustics.bandDba);
      assert.notEqual(result.signatures.acoustics, expected.signatures.acoustics);
    }
  }
});

test('missing or invalid extra-fan quantities and states preserve thermal invariance and signature validity', () => {
  const expected = simulate();
  for (const fans of [null, {}, [fan], [{ ...fan, quantity: undefined }], [{ ...fan, quantity: null }], [{ ...fan, quantity: '1' }], [{ ...fan, stopped: null }]]) {
    const result = simulate({ fans });
    assert.deepEqual(result.thermal, expected.thermal);
    assert.equal(result.signatures.thermal, expected.signatures.thermal);
  }
  const valid = simulateCooling({ fans: [{ ...fan, quantity: 1, stopped: false }] });
  for (const badFields of [{ quantity: null }, { stopped: null }, { installedCount: null }]) {
    const invalid = simulateCooling({ fans: [{ ...fan, quantity: 1, stopped: false, ...badFields }] });
    assert.equal(invalid.acoustics.available, false);
    assert.equal(invalid.acoustics.coverage, 'partial');
    assert.notEqual(invalid.signatures.acoustics, valid.signatures.acoustics);
  }
  const omitted = simulateCooling({ fans: [fan] });
  assert.equal(omitted.signatures.acoustics, valid.signatures.acoustics);
});

test('thermal-only invalid inputs do not suppress acoustic sources and unknown keys preserve invalidity', () => {
  const base = { cpu, cooler, fans: [fan] };
  const expected = simulateCooling(base);
  for (const invalid of [{ inletCelsius: 99 }, { referenceHeatWatts: null, inletCelsius: '' }, { referenceHeatWatts: -1 }]) {
    const result = simulateCooling({ ...base, conditions: invalid });
    assert.equal(result.thermal.available, false);
    assert.deepEqual(result.acoustics, expected.acoustics);
    assert.equal(result.signatures.acoustics, expected.signatures.acoustics);
    assert.notEqual(result.signatures.thermal, expected.signatures.thermal);
  }
  const unknown = simulateCooling({ ...base, conditions: { unknownSetting: true } });
  assert.equal(unknown.thermal.available, false);
  assert.notEqual(unknown.signatures.thermal, expected.signatures.thermal);
  assert.notEqual(unknown.signatures.acoustics, expected.signatures.acoustics);
  const badCoolerSpeed = simulateCooling({ ...base, conditions: { coolerSpeedFraction: 0.49 } });
  assert.deepEqual(badCoolerSpeed.acoustics.bandDba, simulateCooling({ fans: [fan] }).acoustics.bandDba);
  assert.equal(badCoolerSpeed.acoustics.coverage, 'partial');
});

test('all 43 active compatible pairs have three bands and seven mismatches stay incompatible', () => {
  let compatible = 0;
  let incompatible = 0;
  assert.equal(allCpus.length, 10);
  assert.equal(allCoolers.length, 5);
  assert.equal(allFans.length, 4);
  for (const selectedCpu of allCpus) for (const selectedCooler of allCoolers) {
    const result = simulateCooling({ cpu: selectedCpu, cooler: selectedCooler });
    const supported = selectedCooler.specs.supportedSockets.includes(selectedCpu.specs.socket);
    if (supported) {
      compatible++;
      assert.equal(result.thermal.status, 'available', `${selectedCpu.id}/${selectedCooler.id}`);
      assert.deepEqual(result.thermal.scenarioBands.map(row => row.id), ['light', 'mixed', 'sustained']);
      assert.deepEqual(result.thermal.scenarioBands.map(row => row.heatFraction), [0.25, 0.6, 1]);
      result.thermal.scenarioBands.forEach(row => ordered(row.temperatureCelsius));
    } else {
      incompatible++;
      assert.equal(result.thermal.status, 'incompatible');
      assert.equal(result.thermal.available, false);
      assert.deepEqual(result.thermal.scenarioBands, []);
      assert.ok(result.thermal.message.includes('soquete'));
    }
    assert.equal(result.acoustics.available, true); // Standalone assembly noise remains modelled.
  }
  assert.equal(compatible, 43);
  assert.equal(incompatible, 7);
  for (const selectedFan of allFans) assert.equal(simulateCooling({ fans: [selectedFan] }).acoustics.coverage, 'complete');
});

test('every CPU reference comes from its explicit nominal-power scenario, with provenance', () => {
  for (const selectedCpu of allCpus) {
    const result = simulate({ cpu: selectedCpu });
    const profile = cpuLedger.profiles.find(row => row.id === selectedCpu.id);
    assert.equal(result.thermal.referenceHeatWatts, profile.simulationAssumptions.defaultScenarioHeatWatts);
    assert.equal(result.thermal.referenceHeatSourceUrl, profile.manufacturerFacts.sourceUrl);
    for (const scenario of result.thermal.scenarioBands) assert.equal(scenario.heatWatts, profile.simulationAssumptions.defaultScenarioHeatWatts * scenario.heatFraction);
  }
  const custom = simulate({ conditions: { referenceHeatWatts: 181 } });
  assert.equal(custom.thermal.referenceHeatKind, 'user-defined-scenario');
  assert.equal(custom.thermal.referenceHeatSourceUrl, null);
});

test('reviewed arithmetic is reproduced without power uncertainty or double high-load increments', () => {
  for (const [cpuId, coolerId, watts, speed, inlet, expected] of thermalCases) {
    const result = simulateCooling({ cpu: component(cpuId), cooler: component(coolerId), conditions: { referenceHeatWatts: watts, coolerSpeedFraction: speed, inletCelsius: inlet } });
    bounds.forEach((bound, index) => near(sustained(result).temperatureCelsius[bound], expected[index]));
    assert.equal(sustained(result).heatWatts, watts);
  }
});

test('cooler resistance interpolates both heat and relative RPM inside the reviewed grid', () => {
  const result = sustained(simulate({ conditions: { referenceHeatWatts: 253, coolerSpeedFraction: 0.625 } }));
  const base = (0.3 + 0.22) / 2;
  const highLoad = 0.04 * (253 - 190) / (300 - 190);
  near(result.coolerEquivalentResistance.central, base + highLoad);
  near(result.temperatureCelsius.central, 25 + 253 * (0.2 + base + highLoad));
});

test('heat and RPM monotonicity and ordered bands hold for the entire compatible matrix', () => {
  for (const selectedCpu of allCpus) for (const selectedCooler of allCoolers) {
    if (!selectedCooler.specs.supportedSockets.includes(selectedCpu.specs.socket)) continue;
    for (const speed of [0.5, 0.625, 0.75, 0.9, 1]) {
      let previous = { low: -Infinity, central: -Infinity, high: -Infinity };
      for (const watts of [5, 20, 65, 105, 125, 190, 220, 253, 300]) {
        const result = simulateCooling({ cpu: selectedCpu, cooler: selectedCooler, conditions: { referenceHeatWatts: watts, coolerSpeedFraction: speed } });
        for (const scenario of result.thermal.scenarioBands) ordered(scenario.temperatureCelsius);
        const current = sustained(result).temperatureCelsius;
        bounds.forEach(bound => assert.ok(current[bound] >= previous[bound]));
        previous = current;
      }
    }
    let previous = { low: Infinity, central: Infinity, high: Infinity };
    for (const speed of [0.5, 0.625, 0.75, 0.9, 1]) {
      const current = sustained(simulateCooling({ cpu: selectedCpu, cooler: selectedCooler, conditions: { referenceHeatWatts: 253, coolerSpeedFraction: speed } })).temperatureCelsius;
      bounds.forEach(bound => assert.ok(current[bound] <= previous[bound]));
      previous = current;
    }
  }
});

test('extra fans, case, GPU, and extra-fan RPM never change thermal numbers or signatures', () => {
  const baseline = simulate();
  for (const overrides of [
    { fans: [{ ...fan, quantity: 6 }] },
    { fans: [{ id: 'unknown' }] },
    { fans: 'malformed' },
    { caseComponent: { id: 'case', category: 'case', specs: { includedFanCount: 10 } } },
    { gpu: { specs: { tdpWatts: 900 } } },
    { conditions: { extraFanSpeedFraction: 1 } }
  ]) {
    const result = simulate(overrides);
    assert.deepEqual(result.thermal, baseline.thermal);
    assert.equal(result.signatures.thermal, baseline.signatures.thermal);
  }
  assert.equal(coolingSimulationSignatures({ cpu, cooler, conditions: { extraFanSpeedFraction: -1 } }).thermal, baseline.signatures.thermal);
  assert.notEqual(simulate({ fans: [{ ...fan, quantity: 1 }] }).signatures.acoustics, baseline.signatures.acoustics);
});

test('a new inlet shifts all algebraic temperatures by the inlet difference, with no hidden case offset', () => {
  const first = simulate({ conditions: { inletCelsius: 20 } });
  const last = simulate({ conditions: { inletCelsius: 30 } });
  first.thermal.scenarioBands.forEach((row, index) => bounds.forEach(bound => near(last.thermal.scenarioBands[index].temperatureCelsius[bound] - row.temperatureCelsius[bound], 10)));
  assert.deepEqual(first.acoustics.bandDba, last.acoustics.bandDba);
});

test('missing cooler never infers a boxed CPU cooler and missing/invalid inputs remain distinct', () => {
  const boxed = component('cpu-intel-i5-14600k-box');
  const result = simulateCooling({ cpu: boxed });
  assert.equal(result.thermal.status, 'missing');
  assert.deepEqual(result.thermal.missingInputs, ['cooler']);
  assert.equal(result.acoustics.bandDba, null);
  assert.equal(result.acoustics.status, 'no-sources');
  for (const bad of [false, 0, [], {}, 'cpu-intel-i7-13700k']) assert.equal(simulate({ cpu: bad }).thermal.status, 'invalid');
  for (const bad of [false, 0, [], {}, 'cooler-bequiet-pure-rock-3-black']) assert.equal(simulate({ cooler: bad }).thermal.status, 'invalid');
  for (const bad of [null, [], false, 42, 'input']) assert.doesNotThrow(() => simulateCooling(bad));
});

test('bare IDs, edited names/categories/MPNs, and reused identifiers cannot borrow profiles', () => {
  for (const changed of [
    { id: cpu.id }, { ...cpu, id: 'unknown' }, { ...cpu, id: cpu.id.toUpperCase() },
    { ...cpu, name: 'Intel Core i7-13700KF' }, { ...cpu, category: 'gpu' },
    { ...cpu, brand: 'AMD' }, { ...cpu, partNumber: 'unverified' }, { ...cpu, model: 'another-model' },
    { ...cpu, specs: undefined }, { ...cpu, specs: { ...cpu.specs, tdpWatts: 253 } },
    { ...cpu, specs: { ...cpu.specs, cores: 999 } }, { ...cpu, specs: { ...cpu.specs, socket: 'AM5' } }
  ]) {
    const result = simulate({ cpu: changed });
    assert.equal(result.thermal.available, false);
    assert.ok(['invalid', 'unavailable'].includes(result.thermal.status));
    assert.equal(result.thermal.scenarioBands.length, 0);
  }
  for (const changed of [
    { ...cooler, name: 'be quiet! Pure Rock 3 LX' }, { ...cooler, partNumber: 'BK040' },
    { ...cooler, partNumber: undefined }, { ...cooler, category: 'fan' },
    { ...cooler, specs: { ...cooler.specs, includedFanCount: 2 } },
    { ...cooler, specs: { ...cooler.specs, supportedSockets: ['AM4'] } },
    { ...cooler, specs: { ...cooler.specs, partNumber: 'BK040' } }
  ]) {
    const result = simulate({ cooler: changed });
    assert.equal(result.thermal.available, false);
    assert.equal(result.acoustics.coverage, 'partial');
    assert.equal(result.acoustics.bandDba, null);
  }
});

test('all CPUs bind frozen relevant specs, including CPUs without an MPN', () => {
  for (const selectedCpu of allCpus) {
    for (const key of Object.keys(selectedCpu.specs).filter(key => !['includesCpuCooler', 'includedCpuCooler'].includes(key))) {
      const changed = clone(selectedCpu);
      delete changed.specs[key];
      assert.equal(simulate({ cpu: changed }).thermal.available, false, `${selectedCpu.id}/${key}`);
    }
  }
  for (const selectedCooler of allCoolers) {
    const changed = clone(selectedCooler);
    changed.specs.heightMm = 999;
    assert.equal(simulate({ cooler: changed }).thermal.available, false);
  }
});

test('price/image/source refreshes and key ordering do not invalidate exact physics identity', () => {
  const updated = { ...cpu, price: 9.99, image: { src: 'new-image' }, specSourceUrl: 'https://example.com/source' };
  assert.equal(coolingComponentIdentity(updated), coolingComponentIdentity(cpu));
  const coolerUpdated = { ...cooler, price: 500, specs: { ...cooler.specs, powerBasis: 'Updated source note', supportedSockets: [...cooler.specs.supportedSockets].reverse() } };
  assert.equal(coolingComponentIdentity(coolerUpdated), coolingComponentIdentity(cooler));
  const reordered = Object.fromEntries(Object.entries(cpu).reverse());
  reordered.specs = Object.fromEntries(Object.entries(cpu.specs).reverse());
  assert.equal(coolingComponentIdentity(reordered), coolingComponentIdentity(cpu));
  assert.deepEqual(simulate({ cpu: updated, cooler: coolerUpdated }), simulate());
});

test('BK042 binds canonical be quiet! identity; the frozen Cooler Master typo is not accepted', () => {
  const id = 'cooler-bequiet-pure-rock-pro3-black';
  assert.equal(frozenScope.find(row => row.id === id).brand, 'Cooler Master');
  assert.equal(component(id).brand, 'be quiet!');
  assert.equal(simulate({ cooler: component(id) }).thermal.available, true);
  assert.equal(simulate({ cooler: clone(frozenScope.find(row => row.id === id)) }).thermal.status, 'unavailable');
  assert.equal(manifest.identityCorrections[0].sourceUrl, 'https://www.bequiet.com/en/cpucooler/5600');
});

test('unknown Tjmax stays null/unknown; known crossings preserve raw algebraic values', () => {
  const unknown = simulate({ cpu: component('cpu-ryzen-5-5500'), conditions: { referenceHeatWatts: 300 } });
  assert.equal(unknown.thermal.tjMaxCelsius, null);
  assert.equal(unknown.thermal.thermalLimitStatus, 'unknown');
  assert.equal(unknown.thermal.centralReachesLimit, null);
  assert.equal(unknown.thermal.rangeReachesLimit, null);
  unknown.thermal.scenarioBands.forEach(row => assert.equal(row.thermalLimitStatus, 'unknown'));
  const range = simulate({ conditions: { referenceHeatWatts: 190, coolerSpeedFraction: 1, inletCelsius: 23 } });
  assert.equal(range.thermal.thermalLimitStatus, 'range-crosses-limit');
  assert.equal(range.thermal.centralReachesLimit, false);
  assert.equal(range.thermal.rangeReachesLimit, true);
  const central = simulate({ conditions: { referenceHeatWatts: 253, coolerSpeedFraction: 1 } });
  assert.equal(central.thermal.thermalLimitStatus, 'central-reaches-limit');
  assert.equal(central.thermal.tjMaxCelsius, 100);
  near(sustained(central).temperatureCelsius.central, 126.936);
  assert.ok(sustained(central).temperatureCelsius.high > 190); // No plausible-looking clamp.
});

test('extended prior regions carry explicit warnings without claiming measured calibration', () => {
  const compact = component('cooler-noctua-nh-l9a-am4-chromax-black');
  const result = simulate({ cpu: component('cpu-ryzen-5-5500'), cooler: compact, conditions: { referenceHeatWatts: 253 } });
  assert.equal(result.thermal.domainStatus, 'assumption-extension');
  assert.equal(result.thermal.outOfDomain, false);
  assert.ok(result.thermal.warnings.some(row => row.code === 'severe-stress-extrapolation'));
  assert.equal(result.thermal.supportedDomain.measuredCalibrationDomain, null);
  const light = simulate({ conditions: { referenceHeatWatts: 5 } });
  assert.ok(light.thermal.warnings.some(row => row.code === 'low-load-prior'));
  assert.equal(light.thermal.scenarioBands[0].heatWatts, 1.25);
});

test('there is no automatic AIO victory or brand multiplier', () => {
  const air = sustained(simulate({ cooler: component('cooler-bequiet-pure-rock-pro3-black'), conditions: { referenceHeatWatts: 125, coolerSpeedFraction: 1 } })).temperatureCelsius;
  const aio = sustained(simulate({ cooler: component('cooler-arctic-liquid-freezer-iii-pro-360'), conditions: { referenceHeatWatts: 125, coolerSpeedFraction: 1 } })).temperatureCelsius;
  assert.ok(air.central < aio.central);
  assert.ok(air.high > aio.low && aio.high > air.low);
  const amd = simulate({ cpu: component('cpu-ryzen-5-5500'), conditions: { referenceHeatWatts: 125 } });
  const intel = simulate({ conditions: { referenceHeatWatts: 125 } });
  assert.deepEqual(amd.thermal.scenarioBands.map(row => row.temperatureCelsius), intel.thermal.scenarioBands.map(row => row.temperatureCelsius));
});

test('two identical independent fans add 3.0103 dB and six physical kit fans add 7.7815 dB', () => {
  const one = simulateCooling({ fans: [{ ...fan, quantity: 1 }], conditions: { extraFanSpeedFraction: 1 } });
  const two = simulateCooling({ fans: [{ ...fan, quantity: 2 }], conditions: { extraFanSpeedFraction: 1 } });
  bounds.forEach(bound => near(two.acoustics.bandDba[bound] - one.acoustics.bandDba[bound], 10 * Math.log10(2)));
  const six = simulateCooling({ fans: [{ ...kit, quantity: 2 }], conditions: { extraFanSpeedFraction: 1 } });
  assert.equal(six.acoustics.includedSources[0].physicalUnits, 6);
  near(six.acoustics.bandDba.central, 42.78151250383644);
  near(six.acoustics.bandDba.high, 50.78151250383644);
});

test('combined cooler-plus-fan energy reproduces the reviewed subtotal', () => {
  const result = simulate({ fans: [{ ...fan, quantity: 3 }], conditions: { coolerSpeedFraction: 1, extraFanSpeedFraction: 1 } });
  near(result.acoustics.bandDba.low, 39.94974044196614);
  near(result.acoustics.bandDba.central, 44.95797580017582);
  near(result.acoustics.bandDba.high, 49.994794126217684);
});

test('noise interpolates energy through the additional 1775 RPM anchor, never raw dB', () => {
  const exact = simulateCooling({ fans: [fan], conditions: { extraFanSpeedFraction: 1775 / 3000 } });
  near(exact.acoustics.bandDba.central, 25);
  const middle = simulateCooling({ fans: [fan], conditions: { extraFanSpeedFraction: 1650 / 3000 } });
  const fraction = (1650 - 1500) / (1775 - 1500);
  const expected = 10 * Math.log10(10 ** (20 / 10) + fraction * (10 ** (25 / 10) - 10 ** (20 / 10)));
  near(middle.acoustics.bandDba.central, expected);
  assert.ok(Math.abs(middle.acoustics.bandDba.central - (20 + fraction * 5)) > 0.5);
});

test('each AIO is summed once with its fixed pump/VRM already inside the assembly nodes', () => {
  for (const [id, expected] of [['cooler-arctic-liquid-freezer-iii-pro-240-argb-white', 31.7623], ['cooler-arctic-liquid-freezer-iii-pro-360', 33.0139]]) {
    const selected = component(id);
    const result = simulate({ cooler: selected, conditions: { coolerSpeedFraction: 1775 / 3000 } });
    assert.equal(result.acoustics.includedSources.length, 1);
    const source = result.acoustics.includedSources[0];
    assert.equal(source.sourceScope, 'assembly');
    assert.equal(source.physicalUnits, 1);
    assert.equal(source.fixedControls.pumpRpm, 2800);
    assert.equal(source.fixedControls.vrmFanRpm, 2500);
    assert.equal(source.includes.find(row => row.part === 'pump').count, 1);
    assert.equal(source.includes.find(row => row.part === 'VRM fan').count, 1);
    near(result.acoustics.bandDba.central, expected);
    assert.equal(source.provenance.containsGenericAssumptions, true);
    for (const speed of [0.5, 0.75, 1]) {
      const actual = simulate({ cooler: selected, conditions: { coolerSpeedFraction: speed } });
      const node = acousticLedger.profiles.find(row => row.componentId === id).rpmNodes.find(row => row.speedRpmFraction === speed);
      bounds.forEach(bound => near(actual.acoustics.bandDba[bound], node[bound]));
    }
  }
});

test('all acoustic profiles have ordered bands and monotonic speed behavior on the same 1m convention', () => {
  for (const selected of [...allCoolers, ...allFans]) {
    let previous = { low: -Infinity, central: -Infinity, high: -Infinity };
    for (const speed of [0.5, 0.55, 1775 / 3000, 0.625, 0.75, 0.9, 1]) {
      const result = simulateCooling({ ...(selected.category === 'cooler' ? { cooler: selected } : { fans: [selected] }), conditions: { coolerSpeedFraction: speed, extraFanSpeedFraction: speed } });
      ordered(result.acoustics.bandDba);
      bounds.forEach(bound => assert.ok(result.acoustics.bandDba[bound] >= previous[bound]));
      previous = result.acoustics.bandDba;
      assert.equal(result.acoustics.distanceM, 1);
      assert.equal(result.acoustics.convention.id, 'pcpl-1m-aweighted-equivalent-broadband-v1');
      assert.equal(result.acoustics.convention.distanceCorrectionEnabled, false);
    }
  }
});

test('zero selected sources, zero units and stopped fans return null instead of 0 dBA', () => {
  for (const fans of [[], [{ ...fan, quantity: 0 }], [{ ...fan, quantity: 2, installedCount: 0 }], [{ ...fan, quantity: 2, stopped: true }]]) {
    const result = simulateCooling({ fans });
    assert.equal(result.acoustics.bandDba, null);
    assert.equal(result.acoustics.status, 'no-sources');
    assert.equal(result.acoustics.available, false);
    assert.equal(result.acoustics.coverage, 'complete');
  }
  const base = simulate();
  assert.deepEqual(simulate({ fans: [{ ...fan, quantity: 2, stopped: true }] }).acoustics.bandDba, base.acoustics.bandDba);
});

test('explicit installed fan count is physical units; malformed counts are excluded, never coerced', () => {
  const installed = simulateCooling({ fans: [{ ...kit, quantity: 2, installedCount: 4 }], conditions: { extraFanSpeedFraction: 1 } });
  assert.equal(installed.acoustics.includedSources[0].physicalUnits, 4);
  near(installed.acoustics.bandDba.central, 35 + 10 * Math.log10(4));
  for (const quantity of ['2', '', -1, 1.5, Infinity, NaN, null, {}, [], Number.MAX_SAFE_INTEGER + 1, 2n, Symbol('count')]) {
    const result = simulate({ fans: [{ ...fan, quantity }] });
    assert.equal(result.acoustics.coverage, 'partial');
    assert.ok(result.acoustics.excludedSources.some(source => source.reason === 'invalid-fan-quantity'));
    assert.deepEqual(result.acoustics.bandDba, simulate().acoustics.bandDba);
  }
  for (const installedCount of [-1, 7, 1.2, '2', NaN]) assert.equal(simulate({ fans: [{ ...kit, quantity: 2, installedCount }] }).acoustics.coverage, 'partial');
  assert.equal(simulate({ fans: [{ ...fan, stopped: 'yes' }] }).acoustics.coverage, 'partial');
  assert.equal(simulate({ fans: [{ ...kit, quantity: Number.MAX_SAFE_INTEGER }] }).acoustics.coverage, 'partial');
});

test('unknown imported coolers/fans return honest known-source subtotals and name omissions', () => {
  const imported = { id: 'imported-fan', name: 'Imported fan', category: 'fan', brand: 'Other', specs: { unitsPerPack: 1 } };
  const result = simulate({ fans: [imported] });
  assert.equal(result.thermal.available, true);
  assert.equal(result.acoustics.coverage, 'partial');
  assert.deepEqual(result.acoustics.bandDba, simulate().acoustics.bandDba);
  const excluded = result.acoustics.excludedSources.find(source => source.id === imported.id);
  assert.equal(excluded.label, 'Imported fan');
  assert.equal(excluded.selected, true);
  assert.equal(excluded.reason, 'unregistered-profile');
  const unknownCooler = { ...cooler, id: 'unknown-cooler', name: 'Unknown cooler' };
  const knownFanSubtotal = simulate({ cooler: unknownCooler, fans: [fan] });
  assert.equal(knownFanSubtotal.thermal.status, 'unavailable');
  assert.equal(knownFanSubtotal.acoustics.coverage, 'partial');
  near(knownFanSubtotal.acoustics.bandDba.central, 32);
  const unknownOnly = simulateCooling({ fans: [imported] });
  assert.equal(unknownOnly.acoustics.bandDba, null);
  assert.equal(unknownOnly.acoustics.status, 'unavailable');
  assert.equal(unknownOnly.acoustics.coverage, 'partial');
});

test('malformed fans and stale kit-size identities cannot silently disappear or reuse priors', () => {
  for (const fans of [null, false, {}, 'fans', [null], [false], [{}], [fan.id]]) {
    const result = simulate({ fans });
    assert.equal(result.acoustics.coverage, 'partial');
    assert.ok(result.acoustics.excludedSources.some(source => source.affectsCoverage));
    assert.equal(result.thermal.available, true);
  }
  const changedKit = { ...kit, specs: { ...kit.specs, unitsPerPack: 1 } };
  assert.equal(simulate({ fans: [changedKit] }).acoustics.coverage, 'partial');
});

test('unmodelled or unknown case-included fans make noise partial without affecting temperatures', () => {
  const baseline = simulate();
  for (const includedFanCount of [undefined, null, -1, '2', 2.5, 2]) {
    const caseComponent = { id: 'case-test', name: 'Test Case', category: 'case', specs: { includedFanCount } };
    const result = simulate({ caseComponent });
    assert.equal(result.acoustics.coverage, 'partial');
    assert.deepEqual(result.thermal, baseline.thermal);
    assert.deepEqual(result.acoustics.bandDba, baseline.acoustics.bandDba);
    const omission = result.acoustics.excludedSources.find(source => source.id === 'case-included-fans');
    assert.equal(omission.selected, false);
    assert.equal(omission.affectsCoverage, true);
    assert.ok(omission.message);
    if (includedFanCount === 2) {
      assert.equal(omission.physicalUnits, 2);
      assert.equal(omission.caseName, 'Test Case');
      assert.ok(omission.label.includes('Test Case'));
    }
  }
  assert.equal(simulate({ caseComponent: { category: 'case', specs: { includedFanCount: 0 } } }).acoustics.coverage, 'complete');
  assert.equal(simulate({ caseComponent: {} }).acoustics.coverage, 'partial');
});

test('complete means selected cooling coverage only; whole-PC omissions are always explicit', () => {
  for (const result of [simulate(), simulateCooling(), simulate({ fans: [fan] })]) {
    assert.equal(result.acoustics.coverageScope, 'selected-cooling-only');
    for (const id of ['gpu', 'psu', 'drives', 'ambient-background', 'coil-whine']) {
      const omission = result.acoustics.excludedSources.find(source => source.id === id);
      assert.ok(omission);
      assert.equal(omission.affectsCoverage, false);
      assert.equal(omission.selected, false);
    }
    assert.ok(result.acoustics.disclosure.includes('não é o ruído do PC completo'));
  }
});

test('provenance discloses generic assumptions and links without a confidence percentage claim', () => {
  const result = simulate({ cooler: component('cooler-noctua-nh-l9a-am4-chromax-black'), cpu: component('cpu-ryzen-5-5500'), fans: [kit] });
  assert.equal(result.provenance.assumed, true);
  assert.equal(result.provenance.empiricallyCalibrated, false);
  assert.equal(result.provenance.thermal.genericPackagePrior, true);
  result.acoustics.includedSources.forEach(source => {
    assert.equal(source.provenance.genericFallback, true);
    assert.ok(source.provenance.label.includes('genérico'));
    assert.ok(source.provenance.sourceUrls.length > 0);
  });
  assert.ok(result.provenance.sourceUrls.every(url => url.startsWith('https://')));
  for (const forbidden of ['confidencePercent', 'confidenceInterval', 'predictedOperatingTemperature', 'measuredPrediction']) assert.equal(JSON.stringify(result).includes(`"${forbidden}"`), false);
  assert.ok(result.provenance.limitations.some(text => text.includes('não intervalos de confiança')));
});

test('results are deterministic and immutable and never mutate caller-owned inputs', () => {
  const input = { cpu: clone(cpu), cooler: clone(cooler), fans: [{ ...fan, quantity: 2 }], conditions: { referenceHeatWatts: 190 } };
  const before = clone(input);
  const result = simulateCooling(input);
  assert.deepEqual(input, before);
  assert.equal(Object.isFrozen(input), false);
  assert.equal(Object.isFrozen(input.cpu), false);
  for (const object of [result, result.thermal, result.acoustics, result.thermal.scenarioBands, result.thermal.scenarioBands[0].temperatureCelsius, result.provenance]) assert.equal(Object.isFrozen(object), true);
  assert.throws(() => { result.thermal.scenarioBands[0].temperatureCelsius.central = 0; }, TypeError);
  assert.deepEqual(result, simulateCooling(input));
});

test('invalid live inputs expose condition errors and cannot fall back to a previous result', () => {
  const good = simulate();
  const invalid = simulate({ conditions: { inletCelsius: '' } });
  assert.equal(good.thermal.available, true);
  assert.equal(invalid.thermal.available, false);
  assert.equal(invalid.conditions, null);
  assert.equal(invalid.thermal.status, 'invalid');
  assert.ok(invalid.thermal.message);
  assert.deepEqual(invalid.conditionsErrors, invalid.conditionErrors);
  assert.ok(invalid.conditionsErrors.some(error => error.field === 'inletCelsius'));
});

test('duplicate selected fan IDs are excluded as ambiguous instead of double-counted', () => {
  const result = simulate({ fans: [{ ...fan, quantity: 1 }, { ...fan, quantity: 2 }, kit] });
  assert.equal(result.acoustics.coverage, 'partial');
  assert.equal(result.acoustics.includedSources.some(source => source.componentId === fan.id), false);
  const duplicates = result.acoustics.excludedSources.filter(source => source.reason === 'duplicate-fan-selection');
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].selected, true);
  assert.equal(duplicates[0].id, fan.id);
  assert.deepEqual(result.acoustics.bandDba, simulate({ fans: [kit] }).acoustics.bandDba);
  assert.equal(simulate({ fans: [{ ...fan, quantity: 3 }] }).acoustics.coverage, 'complete');
});

test('malformed identity objects do not leak into results or freeze caller-owned metadata', () => {
  const malformed = { id: { bad: 'id' }, name: { bad: 'name' }, category: 'fan', specs: {} };
  const result = simulate({ fans: [malformed] });
  assert.equal(result.acoustics.coverage, 'partial');
  assert.equal(Object.isFrozen(malformed.id), false);
  assert.equal(Object.isFrozen(malformed.name), false);
  assert.ok(result.acoustics.excludedSources.every(source => typeof source.id === 'string' && typeof source.label === 'string'));
});

test('stock-cooler fit metadata does not change an explicit aftermarket thermal profile', () => {
  const updatedCpu = { ...cpu, specs: { ...cpu.specs, includesCpuCooler: true, includedCpuCooler: {
    name: 'Verified bundled cooler', specSourceUrl: 'https://example.test/stock-fit',
    specs: { coolingType: 'air', supportedSockets: [cpu.specs.socket], heightMm: 60 }
  } } };
  const expected = simulate();
  const result = simulate({ cpu: updatedCpu });
  assert.deepEqual(result.thermal, expected.thermal);
  assert.equal(result.signatures.thermal, expected.signatures.thermal);
  const noSelectedCooler = simulateCooling({ cpu: updatedCpu });
  assert.equal(noSelectedCooler.thermal.available, false);
  assert.equal(noSelectedCooler.acoustics.bandDba, null);
});

test('malformed case metadata cannot collide with an unknown valid case-fan count', () => {
  const invalid = simulate({ caseComponent: { id: 'case', category: 'case', specs: null } });
  const unknown = simulate({ caseComponent: { id: 'case', category: 'case', specs: {} } });
  assert.notEqual(invalid.signatures.acoustics, unknown.signatures.acoustics);
  assert.deepEqual(invalid.thermal, unknown.thermal);
});
