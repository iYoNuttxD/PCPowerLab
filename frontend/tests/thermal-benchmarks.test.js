import test from 'node:test';
import assert from 'node:assert/strict';
import { getThermalBenchmark } from '../src/utils/thermalBenchmarks.js';

const cpu = { id: 'cpu-intel-i7-13700k', name: 'Intel Core i7-13700K', category: 'cpu', brand: 'Intel' };
const cooler = { id: 'cooler-bequiet-pure-rock-3-black', name: 'be quiet! Pure Rock 3 Black', category: 'cooler', brand: 'be quiet!', partNumber: 'BK039' };

test('the exact supported pair returns only the two reported temperatures', () => {
  const benchmark = getThermalBenchmark(cpu, cooler);
  assert.deepEqual(benchmark.measurements, [
    { id: 'idle', label: 'Repouso', temperatureCelsius: 36 },
    { id: 'load', label: 'Carga', temperatureCelsius: 95 }
  ]);
  assert.equal(benchmark.metric, 'reported-idle-load');
  assert.equal(benchmark.aggregation, null);
  assert.equal(benchmark.conditions.chartPowerLabelWatts, 190);
  assert.equal(benchmark.measurements.some(value => value.temperatureCelsius === 100), false);
});

test('conditions and original attribution stay attached to the measured result', () => {
  const benchmark = getThermalBenchmark(cpu, cooler);
  assert.deepEqual(benchmark.conditions, {
    ambientCelsius: 23,
    fanPwmPercent: 100,
    chartPowerLabelWatts: 190,
    workload: 'Cinebench R23.2',
    loadDurationMinutes: 30,
    idleDurationMinutes: 10,
    motherboard: 'MSI MEG Z790 ACE MAX',
    case: 'Thermaltake Core P6 em configuração aberta',
    thermalPaste: 'Noctua NT-H1'
  });
  assert.equal(benchmark.source.url, 'https://tech4gamers.com/be-quiet-pure-rock-3-black-air-cooler-review/');
  assert.equal(benchmark.source.chartUrl, 'https://tech4gamers.com/wp-content/uploads/2025/02/be-quiet-Pure-Rock-3-Thermal-Performance-Intel.jpg');
  assert.equal(benchmark.source.publisher, 'Tech4Gamers');
});

test('missing selections and malformed identities never return fabricated measurements', () => {
  for (const missing of [undefined, null, '', {}, [], 0, false, cpu.id]) {
    assert.equal(getThermalBenchmark(missing, cooler), null);
    assert.equal(getThermalBenchmark(cpu, missing), null);
  }
  assert.equal(getThermalBenchmark(), null);
});

test('IDs are exact: unknown, differently cased and related model IDs do not match', () => {
  for (const id of ['cpu-intel-i7-13700kf', 'cpu-intel-i7-14700k', 'cpu-intel-i5-13600k', 'unknown', 'CPU-INTEL-I7-13700K', `${cpu.id} `]) {
    assert.equal(getThermalBenchmark({ ...cpu, id }, cooler), null, id);
  }
  for (const id of ['cooler-bequiet-pure-rock-3', 'cooler-bequiet-pure-rock-3-lx', 'cooler-bequiet-pure-rock-2-black', 'unknown', `${cooler.id} `]) {
    assert.equal(getThermalBenchmark(cpu, { ...cooler, id }), null, id);
  }
});

test('matching names or part numbers cannot substitute for catalog IDs', () => {
  assert.equal(getThermalBenchmark({ name: cpu.name }, cooler), null);
  assert.equal(getThermalBenchmark(cpu, { name: cooler.name, partNumber: cooler.partNumber }), null);
  assert.equal(getThermalBenchmark({ ...cpu, id: 'new-cpu' }, { ...cooler, id: 'new-cooler' }), null);
});

test('catalog IDs suffice when optional identity metadata is not available', () => {
  assert.ok(getThermalBenchmark({ id: cpu.id }, { id: cooler.id }));
  assert.ok(getThermalBenchmark({ ...cpu, model: 'Core i7-13700K' }, { ...cooler, model: 'BK039' }));
  assert.ok(getThermalBenchmark(cpu, { ...cooler, partNumber: ' bk039 ', model: 'Pure Rock 3 Black' }));
});

test('contradictory names, brands and categories reject reused IDs', () => {
  for (const override of [{ name: 'Intel Core i7-13700KF' }, { brand: 'AMD' }, { category: 'cooler' }, { name: 13700 }]) {
    assert.equal(getThermalBenchmark({ ...cpu, ...override }, cooler), null);
  }
  for (const override of [{ name: 'be quiet! Pure Rock 3 LX' }, { brand: 'Noctua' }, { category: 'fan' }, { name: {} }]) {
    assert.equal(getThermalBenchmark(cpu, { ...cooler, ...override }), null);
  }
});

test('optional model and part numbers must match, including nested specs', () => {
  for (const override of [
    { model: 'i7-13700KF' }, { model: 'unknown' }, { model: false },
    { partNumber: 'unverified-order-code' }, { specs: { model: 'i7-14700K' } },
    { specs: { partNumber: 'unverified-order-code' } }
  ]) assert.equal(getThermalBenchmark({ ...cpu, ...override }, cooler), null);
  for (const override of [
    { model: 'Pure Rock 3 LX' }, { model: 'unknown' }, { partNumber: 'BK040' },
    { partNumber: 39 }, { specs: { model: 'Pure Rock 2 Black' } }, { specs: { partNumber: 'BK040' } }
  ]) assert.equal(getThermalBenchmark(cpu, { ...cooler, ...override }), null);
  assert.ok(getThermalBenchmark({ ...cpu, specs: { model: 'i7-13700K' } }, { ...cooler, specs: { partNumber: 'BK039' } }));
});

test('API takes only CPU/cooler and does not model extra fans or other build settings', () => {
  assert.equal(getThermalBenchmark.length, 2);
  const benchmark = getThermalBenchmark(cpu, cooler);
  assert.equal(getThermalBenchmark(cpu, cooler, { fans: [{ quantity: 20 }], ambientCelsius: 40 }), benchmark);
  assert.equal(getThermalBenchmark({ ...cpu, specs: { tdpWatts: 999 } }, { ...cooler, price: 1 }), benchmark);
  assert.equal(Object.hasOwn(benchmark, 'fans'), false);
  assert.equal(Object.hasOwn(benchmark, 'estimate'), false);
  assert.equal(Object.hasOwn(benchmark, 'timeSeries'), false);
});

test('published data is immutable and inputs are not modified', () => {
  const frozenCpu = Object.freeze({ ...cpu, specs: Object.freeze({ model: 'i7-13700K' }) });
  const frozenCooler = Object.freeze({ ...cooler, specs: Object.freeze({ partNumber: 'BK039' }) });
  const benchmark = getThermalBenchmark(frozenCpu, frozenCooler);
  assert.ok(benchmark);
  for (const value of [benchmark, benchmark.cpu, benchmark.cooler, benchmark.measurements, ...benchmark.measurements, benchmark.conditions, benchmark.source]) {
    assert.equal(Object.isFrozen(value), true);
  }
  assert.throws(() => { benchmark.measurements[0].temperatureCelsius = 12; }, TypeError);
  assert.equal(getThermalBenchmark(cpu, cooler).measurements[0].temperatureCelsius, 36);
  assert.deepEqual(frozenCpu, { ...cpu, specs: { model: 'i7-13700K' } });
  assert.deepEqual(frozenCooler, { ...cooler, specs: { partNumber: 'BK039' } });
});
