import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { app } from '../src/app.js';
import { components } from '../src/data/components.mock.js';
import { findComponentById } from '../src/services/component.service.js';
import { checkBuildCompatibility } from '../src/services/compatibility.service.js';
import { checkCoolingCompatibility } from '../src/services/cooling.service.js';
import { enrichCaseCooling } from '../src/data/caseCooling.v21.js';
import { marketRevalidationCatalog } from '../src/data/market-revalidation-catalog.js';
import { currentBuild } from './helpers/current-build.js';
const caseId = 'case-coolermaster-elite301-white';
const pack = 'fan-coolermaster-sickleflow-edge-120-argb-white-3-pack';
const codes = result => result.alerts.map(alert => alert.code);

test('all sourced case dimensions survive real catalog resolution; unknown legacy stays unknown', () => {
  const expected = { 'case-cooler-master-q300l': 159, 'case-corsair-4000d-airflow': 170,
    'case-montech-air-903-base': 180, 'case-cooler-master-elite-502-white': 170, [caseId]: 163.5 };
  for (const [id, height] of Object.entries(expected)) assert.equal(findComponentById(id).specs.maxCoolerHeightMm, height, id);
  for (const id of ['case-mid-tower-airflow', 'case-compact-matx', 'case-gamer-atx-rgb', 'case-nzxt-h5-flow']) {
    assert.equal(findComponentById(id).specs.maxCoolerHeightMm, null, id);
  }
  const c = findComponentById(caseId);
  assert.deepEqual(c.specs.fanLayouts, { front: ['3x120'], top: ['2x120', '2x140'], rear: ['1x120'] });
  assert.equal(c.specs.includedFanCount, 3);
  assert.equal(c.specs.includedFansPosition, 'front');
  assert.equal(c.specs.maxRadiatorThicknessMm, null);
  assert.equal(c.specs.maxFanThicknessMm, null);
  const reference = JSON.parse(readFileSync(new URL('../src/data/dated-price-references.json', import.meta.url), 'utf8'));
  for (const id of [caseId, 'case-cooler-master-elite-502-white']) {
    assert.equal(findComponentById(id).price, reference.find(record => record.productId === id).price);
    assert.ok(Number.isFinite(findComponentById(id).price));
    assert.equal(findComponentById(id).image.status, 'verified');
  }
  const raw = marketRevalidationCatalog.find(record => record.id === caseId);
  assert.equal(enrichCaseCooling({ ...raw, partNumber: 'other-SKU' }).specs.maxCoolerHeightMm, null);
  assert.equal(enrichCaseCooling({ ...raw, specSourceUrl: 'https://example.org/not-evidence' }).specs.maxCoolerHeightMm, null);
});
test('real Elite301 and catalog fans/radiators enforce actual nominal support', () => {
  const base = { ...currentBuild, caseId };
  const exact = checkBuildCompatibility({ ...base, fans: [{ fanId: pack, quantity: 1 }] });
  assert.ok(!codes(exact).includes('CASE_FAN_CAPACITY_EXCEEDED'));
  assert.ok(codes(checkBuildCompatibility({ ...base, fans: [{ fanId: pack, quantity: 2 }] })).includes('CASE_FAN_CAPACITY_EXCEEDED'));
  assert.ok(codes(checkBuildCompatibility({ ...base, coolerId: 'cooler-arctic-liquid-freezer-iii-pro-360' })).includes('CASE_RADIATOR_SIZE_INCOMPATIBLE'));
  const mixed = checkBuildCompatibility({ ...base, fans: [{ fanId: 'fan-arctic-p12-pro', quantity: 2 }, { fanId: 'fan-noctua-nf-a14-pwm', quantity: 2 }] });
  assert.ok(codes(mixed).includes('CASE_FAN_CAPACITY_EXCEEDED'));
});
test('HTTP resolution uses actual Elite301 height rather than wiped enrichment fields', async t => {
  const tall = { id: 'fixture-air-180mm', name: 'Test 180 mm air cooler', category: 'cooler', specs: { coolingType: 'air', supportedSockets: ['AM4'], heightMm: 180, powerWatts: 1 } };
  components.push(tall); t.after(() => components.splice(components.indexOf(tall), 1));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await globalThis.fetch(`http://127.0.0.1:${server.address().port}/api/v1/compatibility/check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...currentBuild, caseId, coolerId: tall.id }) });
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.equal(data.selectedComponents.case.id, caseId);
  assert.equal(data.selectedComponents.case.specs.maxCoolerHeightMm, 163.5);
  assert.ok(codes(data).includes('CASE_COOLER_HEIGHT_INCOMPATIBLE'));
});
test('real Elite502 applies front dimensions only to front candidates', () => {
  const chassis = findComponentById('case-cooler-master-elite-502-white');
  const run = (size, thickness, length = 450, width = 138) => checkCoolingCompatibility({ case: chassis, cpu: { specs: { socket: 'AM4' } }, cooler: { id: 'fixture-aio', specs: { coolingType: 'aio', supportedSockets: ['AM4'], radiatorSizeMm: size, radiatorThicknessMm: thickness, radiatorDimensionsMm: { length, width }, powerWatts: 1 } } });
  assert.ok(codes(run(420, 38)).includes('CASE_RADIATOR_DIMENSIONS_INCOMPATIBLE'));
  assert.ok(codes(run(420, 27, 458)).includes('CASE_RADIATOR_DIMENSIONS_INCOMPATIBLE'));
  assert.ok(codes(run(420, 27, 450, 141)).includes('CASE_RADIATOR_DIMENSIONS_INCOMPATIBLE'));
  assert.ok(!codes(run(360, 38)).includes('CASE_RADIATOR_DIMENSIONS_INCOMPATIBLE'));
  assert.ok(run(360, 38).unverifiedChecks.some(issue => issue.code === 'RADIATOR_CLEARANCE_UNVERIFIED'));
});
