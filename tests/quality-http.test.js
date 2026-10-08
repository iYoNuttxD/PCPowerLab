import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { app } from '../src/app.js';

const priceFacts = JSON.parse(readFileSync(new URL('./helpers/approved-price-facts.json', import.meta.url), 'utf8'));
function assertIncompletePrice(result, knownSubtotal, missingIds) {
  assert.equal(result.totalEstimatedPrice, null);
  assert.equal(result.pricing.estimatedTotal, null);
  assert.equal(result.pricing.knownReferenceSubtotal, knownSubtotal);
  assert.equal(result.pricing.referenceTotalComplete, false);
  assert.deepEqual(result.pricing.componentsWithoutReference, missingIds);
}

// Actual Express routing, JSON parser, controllers, domain services and in-memory
// repositories. No endpoint interception, fake response or service replacement.
test('quality HTTP journey: catalog, analysis, budget, replacement, cooling, save/export/share/reload', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  async function call(path, body, expected = 200, method = body === undefined ? 'GET' : 'POST') {
    const response = await globalThis.fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body !== undefined && { body: JSON.stringify(body) }) });
    const payload = await response.json();
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(payload)}`);
    assert.equal(payload.success, expected < 400);
    if (expected >= 400) { assert.equal('data' in payload, false); return payload; }
    return payload.data;
  }
  const catalog = await call('/components');
  const ids = new Set(catalog.map(part => part.id));
  assert.equal(ids.size, catalog.length);
  const ready = (await call('/ready-builds'))[0];
  const build = ready.components;
  const coreIds = Object.values(build);
  assert.equal(coreIds.length, 7);
  for (const id of coreIds) assert.equal(catalog.find(part => part.id === id).price, priceFacts[id].price, id);
  const referenceCents = coreIds.reduce((sum, id) => sum + Math.round(priceFacts[id].price * 100), 0);
  const sum = (build, amount = 10000) => call('/build-summary', { build, budget: { amount }, gameId: 'game-cyberpunk-2077', targetResolution: '1080p', qualityPreset: 'high' });
  let saved;
  await t.test('catalog categories, price truth, empty result and invalid input', async () => {
    for (const category of ['cooler', 'fan', 'ram', 'storage']) {
      const filtered = await call(`/components?category=${category}`);
      assert.ok(filtered.length > 0);
      assert.ok(filtered.every(part => part.category === category && part.pricing));
      for (const part of filtered) assert.equal((await call(`/components/${part.id}`)).id, part.id);
    }
    assert.deepEqual(await call('/performance/games?category=nonexistent'), []);
    await call('/components?category=not-a-category', undefined, 400);
    await call('/components/no-such-part', undefined, 404);
    const preview = await call('/components/compatibility', { build, category: 'cpu' });
    assert.ok(preview.length > 0);
    assert.ok(preview.some(entry => entry.compatible === false));
  });
  await t.test('complete/incomplete/incompatible, budget changes and RAM replacement', async () => {
    const original = await sum(build);
    assert.equal(original.compatibility.compatible, true);
    assert.equal(original.totalEstimatedPrice, referenceCents / 100);
    assert.equal(original.pricing.marketTotalComplete, false);
    assert.equal(original.pricing.availableMarketQuotesTotal, null);
    assert.ok(original.gamePerformance.estimatedFps > 0);
    const over = await sum(build, 100);
    assert.equal(over.budgetStatus.status, 'over_budget');
    assert.equal(over.totalEstimatedPrice, original.totalEstimatedPrice);
    assert.deepEqual(over.components, original.components);
    await call('/build-summary', { build: { cpuId: build.cpuId } }, 400);
    await call('/build-summary', { build: { ...build, cpuId: 'unknown' } }, 404);
    const invalid = await sum({ ...build, cpuId: 'cpu-intel-i5-12400f' });
    assert.equal(invalid.compatibility.compatible, false);
    assert.equal(invalid.gamePerformance.available, false);
    assert.equal('estimatedFps' in invalid.gamePerformance, false);
    const changed = await sum({ ...build, ramId: 'ram-kingston-fury-16gb-ddr4-3600' });
    for (const slot of ['cpu', 'gpu', 'motherboard', 'storage', 'psu', 'case']) assert.deepEqual(changed.components[slot], original.components[slot]);
    assert.equal(changed.components.ram.id, 'ram-kingston-fury-16gb-ddr4-3600');
    assert.equal(changed.totalEstimatedPrice, (referenceCents - 179999 + 30699) / 100);
    assert.equal(changed.compatibility.compatible, true);
    assert.ok(changed.gamePerformance.estimatedFps > 0);
    const unpriced = await sum({ ...build, ramId: 'ram-crucial-32gb-ddr4-3200' });
    assertIncompletePrice(unpriced, (referenceCents - 179999) / 100, ['ram-crucial-32gb-ddr4-3200']);
    assert.equal(unpriced.components.ram.price, null);
    assert.equal(unpriced.budgetStatus.status, 'unavailable');
    assert.equal(unpriced.budgetStatus.remaining, null);
    assert.equal(unpriced.compatibility.compatible, true);
    assert.ok(unpriced.gamePerformance.estimatedFps > 0);
  });
  await t.test('cooling quantities, unknown compatibility, save/version/export/share and removal', async () => {
    const pricedCooling = await sum({ ...build, coolerId: 'cooler-deepcool-ak620', fans: [{ fanId: 'fan-noctua-nf-a14-pwm', quantity: 2 }] });
    assert.equal(pricedCooling.totalEstimatedPrice, (referenceCents + 44999 + 2 * 19499) / 100);
    assert.equal(pricedCooling.pricing.referenceTotalComplete, true);
    const cooler = catalog.find(part => part.id === 'cooler-noctua-nh-u12s-redux');
    const fan = catalog.find(part => part.id === 'fan-noctua-nf-p12-redux-1700-pwm');
    assert.equal(cooler.price, null);
    assert.equal(fan.price, null);
    const cooling = { ...build, coolerId: cooler.id, fans: [{ fanId: fan.id, quantity: 2 }] };
    const cooled = await sum(cooling);
    assert.equal(cooled.compatibility.compatible, false);
    assert.ok(['unverified', 'incompatible'].includes(cooled.compatibility.status));
    assert.equal(cooled.gamePerformance.available, false);
    const missingIds = [cooler.id, fan.id];
    assertIncompletePrice(cooled, referenceCents / 100, missingIds);
    assert.equal(cooled.pricing.unavailableReferenceUnits, 3);
    assert.equal(cooled.budgetStatus.status, 'unavailable');
    assert.equal(cooled.budgetStatus.remaining, null);
    saved = await call('/saved-builds', { name: 'HTTP quality round-trip', components: cooling, budget: { amount: 10000 }, totalEstimatedPrice: 1 }, 201);
    assertIncompletePrice(saved, referenceCents / 100, missingIds);
    const reloaded = await call(`/saved-builds/${saved.id}`);
    assert.deepEqual(reloaded, saved);
    const versions = await call(`/saved-builds/${saved.id}/versions`);
    assert.equal(versions.length, 1);
    assert.deepEqual(versions[0].buildSnapshot.components, saved.components);
    assertIncompletePrice(versions[0].buildSnapshot, referenceCents / 100, missingIds);
    const exported = await call(`/saved-builds/${saved.id}/export/json?includeSummary=true`);
    assert.deepEqual(exported.build.components, cooling);
    assertIncompletePrice(exported.summary, referenceCents / 100, missingIds);
    assertIncompletePrice(await sum(JSON.parse(JSON.stringify(exported.build))), referenceCents / 100, missingIds);
    const shared = await call('/share/build', { buildId: saved.id });
    assert.equal(shared.shareUrl, `/shared/${shared.shareId}`);
    assert.deepEqual((await call(`/share/build/${shared.shareId}`)).buildSummary, shared.buildSummary);
    assert.deepEqual(shared.buildSummary.componentIds.fans, cooling.fans);
    assertIncompletePrice(shared.buildSummary, referenceCents / 100, missingIds);
    assert.equal(shared.buildSummary.budgetStatus.status, 'unavailable');
    const removed = await call(`/saved-builds/${saved.id}`, { components: { cooler: null, fans: [] } }, 200, 'PATCH');
    assert.equal(removed.totalEstimatedPrice, referenceCents / 100);
    assert.equal(removed.components.cooler, null);
    assert.equal((await call(`/saved-builds/${saved.id}/versions`)).length, 2);
    assert.deepEqual((await call(`/saved-builds/${saved.id}/versions/${versions[0].id}`)).buildSnapshot.components, saved.components);
    await call(`/saved-builds/${saved.id}`, { components: { cpu: 'cpu-intel-i5-12400f' } }, 200, 'PATCH');
    await call(`/saved-builds/${saved.id}/revalidate`, {});
    assert.ok((await call(`/notifications?buildId=${saved.id}`)).length > 0);
    await call(`/saved-builds/${saved.id}`, undefined, 200, 'DELETE');
    assert.deepEqual(await call(`/notifications?buildId=${saved.id}`), []);
    await call(`/saved-builds/${saved.id}`, undefined, 404);
    assert.deepEqual((await call(`/share/build/${shared.shareId}`)).buildSummary, shared.buildSummary);
  });
  await t.test('single/multiple games, software, bottlenecks and build comparison use actual service outputs', async () => {
    const input = { build, gameId: 'game-cyberpunk-2077', targetResolution: '1080p', qualityPreset: 'high' };
    const game = await call('/performance/simulate-game', input);
    const high = await call('/performance/simulate-game', { ...input, targetResolution: '4k' });
    assert.ok(game.estimatedFps > high.estimatedFps && high.estimatedFps > 0);
    const compared = await call('/performance/compare-games', { ...input, gameIds: ['game-cyberpunk-2077', 'game-counter-strike-2'] });
    assert.equal(compared.results.length, 2);
    assert.equal(compared.results.find(result => result.gameId === input.gameId).estimatedFps, game.estimatedFps);
    await call('/performance/compare-games', { ...input, gameIds: [input.gameId] }, 400);
    for (const invalidBuild of [{ ...build, cpuId: 'cpu-intel-i5-12400f' }, { ...build, coolerId: catalog.find(part => part.category === 'cooler').id }]) {
      await call('/performance/simulate-game', { ...input, build: invalidBuild }, 422);
      await call('/performance/compare-games', { ...input, build: invalidBuild, gameIds: ['game-cyberpunk-2077', 'game-counter-strike-2'] }, 422);
      await call('/performance/simulate-software', { build: invalidBuild, softwareId: 'software-blender' }, 422);
    }
    const software = await call('/performance/simulate-software', { build, softwareId: 'software-blender' });
    assert.ok(Number.isFinite(software.performanceScore));
    await call('/performance/simulate-game', { ...input, gameId: 'missing-game' }, 404);
    const bottlenecks = await call('/bottlenecks/analyze', build);
    assert.ok(bottlenecks.performanceSummary.cpuScore > 0);
    const comparison = await call('/build-comparison', { builds: [{ name: 'Original', components: build }, { name: 'Incompatible', components: { ...build, cpuId: 'cpu-intel-i5-12400f' } }], gameId: input.gameId });
    assert.equal(comparison.builds[0].compatible, true);
    assert.equal(comparison.builds[1].compatible, false);
    assert.equal(comparison.recommendedBuild.name, 'Original');
  });
  await t.test('recommendation budget limits and upgrades preserve actual compatibility', async () => {
    await call('/recommendations/budget', { budget: { amount: 100 } }, 422);
    for (const amount of [4000, 6000]) {
      const recommended = await call('/recommendations/budget', { budget: { amount }, usageType: 'gaming' });
      assert.ok(recommended.totalEstimatedPrice <= amount);
      const selection = Object.fromEntries(Object.entries(recommended.components).map(([slot, part]) => [slot, part.id]));
      const summary = await sum(selection, amount);
      assert.equal(summary.compatibility.compatible, true);
      assert.equal(summary.totalEstimatedPrice, recommended.totalEstimatedPrice);
    }
    const result = await call('/upgrades/suggest', { build, budget: { amount: 1500 }, usageType: 'gaming' });
    assert.ok(result.suggestions.length > 0);
    for (const suggestion of result.suggestions) {
      assert.ok(suggestion.estimatedUpgradeCost <= 1500);
      assert.notEqual(suggestion.suggestedComponent.id, suggestion.currentComponent.id);
      const changed = { ...build, [`${suggestion.suggestedComponent.category}Id`]: suggestion.suggestedComponent.id };
      assert.equal((await sum(changed)).compatibility.compatible, true);
    }
  });
  await t.test('malformed HTTP JSON, unknown routes and retry after controlled failures', async () => {
    const malformed = await globalThis.fetch(`${base}/build-summary`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).success, false);
    await call('/no-such-endpoint', undefined, 404);
    await call('/build-summary', [], 400);
    await call('/build-comparison', { builds: [null, {}] }, 400);
    assert.equal((await sum(build)).compatibility.compatible, true);
  });
});
