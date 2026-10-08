import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';

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
  const referenceCents = coreIds.reduce((sum, id) => sum + Math.round(catalog.find(part => part.id === id).price * 100), 0);
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
    const changed = await sum({ ...build, ramId: 'ram-crucial-32gb-ddr4-3200' });
    for (const slot of ['cpu', 'gpu', 'motherboard', 'storage', 'psu', 'case']) assert.deepEqual(changed.components[slot], original.components[slot]);
    assert.equal(changed.components.ram.id, 'ram-crucial-32gb-ddr4-3200');
    assert.equal(changed.totalEstimatedPrice, (referenceCents - Math.round(original.components.ram.price * 100) + Math.round(changed.components.ram.price * 100)) / 100);
  });
  await t.test('cooling quantities, unknown compatibility, save/version/export/share and removal', async () => {
    const cooler = catalog.find(part => part.category === 'cooler');
    const fan = catalog.find(part => part.category === 'fan');
    const cooling = { ...build, coolerId: cooler.id, fans: [{ fanId: fan.id, quantity: 2 }] };
    const cooled = await sum(cooling);
    assert.equal(cooled.compatibility.compatible, false);
    assert.ok(['unverified', 'incompatible'].includes(cooled.compatibility.status));
    assert.equal(cooled.gamePerformance.available, false);
    const expected = (referenceCents + Math.round(cooler.price * 100) + 2 * Math.round(fan.price * 100)) / 100;
    assert.equal(cooled.totalEstimatedPrice, expected);
    saved = await call('/saved-builds', { name: 'HTTP quality round-trip', components: cooling, budget: { amount: 10000 }, totalEstimatedPrice: 1 }, 201);
    assert.equal(saved.totalEstimatedPrice, expected);
    const reloaded = await call(`/saved-builds/${saved.id}`);
    assert.deepEqual(reloaded, saved);
    const versions = await call(`/saved-builds/${saved.id}/versions`);
    assert.equal(versions.length, 1);
    assert.deepEqual(versions[0].buildSnapshot.components, saved.components);
    const exported = await call(`/saved-builds/${saved.id}/export/json?includeSummary=true`);
    assert.deepEqual(exported.build.components, cooling);
    assert.equal((await sum(JSON.parse(JSON.stringify(exported.build)))).totalEstimatedPrice, expected);
    const shared = await call('/share/build', { buildId: saved.id });
    assert.equal(shared.shareUrl, `/shared/${shared.shareId}`);
    assert.deepEqual((await call(`/share/build/${shared.shareId}`)).buildSummary, shared.buildSummary);
    assert.deepEqual(shared.buildSummary.componentIds.fans, cooling.fans);
    assert.equal(shared.buildSummary.totalEstimatedPrice, expected);
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
