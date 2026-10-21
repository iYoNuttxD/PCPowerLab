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
  // Isolate one preset with its own test copy of the real board. Shared current
  // recipes must not all lose their limits when testing a single failure.
  const isolatedBoard = { ...board, id: 'test-ready-isolated-board', specs: { ...board.specs } };
  components.push(isolatedBoard);
  t.after(() => {
    preset.components = originalComponents;
    components.splice(components.indexOf(isolatedBoard), 1);
  });
  preset.components = { ...preset.components, motherboardId: isolatedBoard.id, ramId: 'ram-kf436c17bbk2-16' };
  assert.equal(checkBuildCompatibility(preset.components).compatible, true);
  delete isolatedBoard.specs.memorySlots;
  delete isolatedBoard.specs.maxMemoryGb;
  assert.equal(checkBuildCompatibility(preset.components).status, 'unverified');
  return preset;
}

function assertVerifiedRemainder(result, excludedId) {
  assert.deepEqual(result.map(build => build.id), readyBuilds.filter(build => build.id !== excludedId).map(build => build.id));
  for (const build of result) {
    const { coolingAssessment, ...core } = build.compatibility;
    assert.deepEqual(core, { compatible: true, status: 'compatible', alerts: [], unverifiedChecks: [] });
    assert.equal(coolingAssessment.status, 'unverified');
    assert.equal(coolingAssessment.scope, 'cooling_not_assessed');
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

test('one preset with unknown board limits remains usable without being labeled verified', async t => {
  const preset=removeOnePresetsBoardLimits(t);
  const warning=t.mock.method(console,'warn',()=>{});
  const server=app.listen(0,'127.0.0.1');
  await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const base=`http://127.0.0.1:${server.address().port}/api/v1/ready-builds`;
  const response=await globalThis.fetch(base), payload=await response.json();
  assert.equal(response.status,200);assert.equal(payload.data.length,9);
  const item=payload.data.find(row=>row.id===preset.id);
  assert.equal(item.compatibility.status,'unverified');
  assert.deepEqual(item.compatibility.alerts,[]);
  assert.deepEqual(item.compatibility.unverifiedChecks.map(check=>check.code),['RAM_SLOT_COUNT_UNVERIFIED','RAM_CAPACITY_LIMIT_UNVERIFIED']);
  assert.equal(warning.mock.calls.length,0);
  assert.equal(getReadyBuildById(preset.id).compatibility.status,'unverified');
  const filtered=await globalThis.fetch(`${base}?profile=${preset.usageProfile}`);
  assert.ok((await filtered.json()).data.some(row=>row.id===preset.id));
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
