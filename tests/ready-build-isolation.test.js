import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { components } from '../src/data/components.mock.js';
import { readyBuilds } from '../src/data/readyBuilds.js';
import { checkBuildCompatibility } from '../src/services/compatibility.service.js';
import { getReadyBuildById, listReadyBuilds } from '../src/services/readyBuildsService.js';

function removeOnePresetsBoardLimits(t) {
  const preset = readyBuilds.find(build => build.id === 'ready-build-cost-benefit-1440p-entry');
  const board = components.find(component => component.id === preset.components.motherboardId);
  const originalComponents = preset.components;
  const originalSpecs = board.specs;
  t.after(() => {
    preset.components = originalComponents;
    board.specs = originalSpecs;
  });

  // Only this preset uses the board. Pair it with a concrete replacement RAM kit
  // so the missing physical limits really make the compatibility check unknown.
  assert.equal(readyBuilds.filter(build => build.components.motherboardId === board.id).length, 1);
  preset.components = { ...preset.components, ramId: 'ram-kf432c16bb12ak2-32' };
  assert.equal(checkBuildCompatibility(preset.components).compatible, true);
  board.specs = { ...board.specs };
  delete board.specs.memorySlots;
  delete board.specs.maxMemoryGb;
  assert.equal(checkBuildCompatibility(preset.components).status, 'unverified');
  return preset;
}

function assertVerifiedRemainder(result, excludedId) {
  assert.deepEqual(result.map(build => build.id), readyBuilds.filter(build => build.id !== excludedId).map(build => build.id));
  for (const build of result) {
    assert.deepEqual(build.compatibility, { compatible: true, status: 'compatible', alerts: [], unverifiedChecks: [] });
    assert.equal(checkBuildCompatibility(build.components).compatible, true);
  }
}

test('all nine ready presets retain explicit verified compatibility and the array contract', t => {
  const warning = t.mock.method(console, 'warn', () => {});
  const result = listReadyBuilds();
  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, 9);
  assertVerifiedRemainder(result, null);
  assert.equal(warning.mock.calls.length, 0);
});

test('one preset with missing board limits is excluded without breaking the HTTP list or marking it compatible', async t => {
  const preset = removeOnePresetsBoardLimits(t);
  const warning = t.mock.method(console, 'warn', () => {});
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}/api/v1/ready-builds`;

  const response = await globalThis.fetch(base);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.success, true);
  assertVerifiedRemainder(payload.data, preset.id);
  assert.equal(payload.data.length, 8);
  assert.equal(warning.mock.calls.length, 1);
  const diagnostic = warning.mock.calls[0].arguments[1];
  assert.equal(diagnostic.code, 'READY_BUILD_EXCLUDED');
  assert.equal(diagnostic.readyBuildId, preset.id);
  assert.equal(diagnostic.reason, 'READY_BUILD_UNVERIFIED');
  assert.equal(diagnostic.status, 'unverified');
  assert.deepEqual(diagnostic.componentIds, preset.components);
  assert.deepEqual(diagnostic.alerts, []);
  assert.deepEqual(diagnostic.unverifiedChecks.map(check => check.code), ['RAM_SLOT_COUNT_UNVERIFIED', 'RAM_CAPACITY_LIMIT_UNVERIFIED']);
  assert.ok(diagnostic.unverifiedChecks.every(check => check.verification === 'unverified' && check.message));
  assert.deepEqual(diagnostic.errors, diagnostic.unverifiedChecks.map(check => check.message));

  const filtered = await globalThis.fetch(`${base}?profile=${preset.usageProfile}`);
  assert.equal(filtered.status, 200);
  assert.deepEqual((await filtered.json()).data, []);
  assert.equal(warning.mock.calls.length, 2);
  assert.equal(warning.mock.calls[1].arguments[1].readyBuildId, preset.id);

  assert.throws(() => getReadyBuildById(preset.id), error => {
    assert.equal(error.statusCode, 500);
    assert.equal(error.compatibility.compatible, false);
    assert.equal(error.compatibility.status, 'unverified');
    assert.deepEqual(error.errors, diagnostic.errors);
    return true;
  });
  assert.equal(warning.mock.calls.length, 2);
});

test('known invalid and incompatible presets are isolated only in listings', async t => {
  const scenarios = [
    { name: 'incompatible socket', change: preset => { preset.components = { ...preset.components, cpuId: 'cpu-intel-i5-12400f' }; }, code: 'READY_BUILD_INCOMPATIBLE', status: 500 },
    { name: 'orphan component', change: preset => { preset.components = { ...preset.components, cpuId: 'cpu-does-not-exist' }; }, code: 'READY_BUILD_INVALID_COMPONENTS', status: 500 },
    { name: 'wrong component category', change: preset => { preset.components = { ...preset.components, ramId: preset.components.gpuId }; }, code: 'READY_BUILD_INVALID_COMPONENTS', status: 500 },
    { name: 'invalid preset profile', change: preset => { preset.usageProfile = 'invalid-profile'; }, code: 'READY_BUILD_INVALID_PROFILE', status: 400 }
  ];
  for (const scenario of scenarios) {
    await t.test(scenario.name, t => {
      const preset = readyBuilds[0];
      const originalComponents = preset.components;
      const originalProfile = preset.usageProfile;
      t.after(() => { preset.components = originalComponents; preset.usageProfile = originalProfile; });
      const warning = t.mock.method(console, 'warn', () => {});
      scenario.change(preset);
      assertVerifiedRemainder(listReadyBuilds(), preset.id);
      assert.equal(warning.mock.calls.length, 1);
      assert.equal(warning.mock.calls[0].arguments[1].readyBuildId, preset.id);
      assert.equal(warning.mock.calls[0].arguments[1].reason, scenario.code);
      assert.throws(() => getReadyBuildById(preset.id), error => {
        assert.equal(error.statusCode, scenario.status);
        assert.equal(error.code, scenario.code);
        assert.ok(error.errors.length > 0);
        return true;
      });
    });
  }
});

test('invalid filters and missing IDs retain their existing errors rather than producing empty lists', t => {
  const warning = t.mock.method(console, 'warn', () => {});
  assert.throws(() => listReadyBuilds({ profile: 'invalid-profile' }), { statusCode: 400, message: 'Perfil de uso invalido.' });
  assert.throws(() => getReadyBuildById('missing-preset'), { statusCode: 404, message: 'Configuracao pronta nao encontrada.' });
  assert.equal(warning.mock.calls.length, 0);
});

test('unexpected service failures are not silently hidden by preset isolation', t => {
  const preset = readyBuilds[0];
  const originalComponents = preset.components;
  const failure = new Error('Unexpected fixture failure');
  t.after(() => { Object.defineProperty(preset, 'components', { value: originalComponents, configurable: true, enumerable: true, writable: true }); });
  Object.defineProperty(preset, 'components', { get() { throw failure; }, configurable: true, enumerable: true });
  const warning = t.mock.method(console, 'warn', () => {});
  assert.throws(() => listReadyBuilds(), error => error === failure);
  assert.equal(warning.mock.calls.length, 0);
});
