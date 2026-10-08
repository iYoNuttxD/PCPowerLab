// Three technical personas through actual frontend adapters and Express HTTP.
// No browser, endpoint mocks, invented users, catalog additions or market quotes.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { build: bundle } = require('esbuild');
process.env.NODE_ENV = 'production';
const { app } = await import('../src/app.js');
const server = app.listen(0, '127.0.0.1');
await new Promise((done, fail) => { server.once('listening', done); server.once('error', fail); });
const origin = `http://127.0.0.1:${server.address().port}`;
const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-journeys-'));
const records = { method: 'frontend adapters/utilities + real HTTP/Express/services/in-memory repository; no browser', browserExecuted: false, screenshots: [], journeys: [] };
try {
  const services = ['components', 'recommendation', 'savedBuilds', 'buildSummary', 'performance', 'usageProfiles', 'upgrade', 'upgradeRoadmap', 'buildRecommendation', 'buildComparison', 'explanation'];
  const utilities = ['buildHelpers', 'buildTransitions', 'componentPresentation', 'catalogSelection', 'replacementComparison', 'componentImage'];
  const output = join(temporary, 'adapters.mjs');
  await bundle({ stdin: { contents: [...services.map(name => `export * from './src/services/${name}Service.js';`), ...utilities.map(name => `export * from './src/utils/${name}.js';`)].join('\n'), resolveDir: resolve('frontend') }, bundle: true, platform: 'node', format: 'esm', outfile: output, define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(`${origin}/api/v1`) } });
  const ui = await import(pathToFileURL(output));
  const catalog = await ui.componentsService.getAll();
  assert.equal(catalog.length, 98);
  const map = Object.fromEntries(catalog.map(part => [part.id, part]));
  const settings = { gameId: 'game-counter-strike-2', targetResolution: '1080p', qualityPreset: 'high' };
  const summary = (selection, amount) => ui.buildSummaryService.generate({ build: ui.buildToApiPayload(selection), budget: { amount }, ...settings });
  const independentTotal = selection => Object.entries(selection).reduce((total, [slot, part]) => total + (slot === 'fans' ? part.reduce((sum, fan) => sum + Math.round(map[fan.id].price * 100) * fan.quantity, 0) : part?.id ? Math.round(map[part.id].price * 100) : 0), 0) / 100;
  async function route(path) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.match(await response.text(), /id="root"/);
    return { route: path, http: 200, hydration: 'not executed' };
  }
  async function saveReload(name, selection, amount) {
    const payload = ui.normalizeSavedBuildPayload({ name, selectedComponents: selection, budget: { amount, priority: 'cost-benefit' }, usageType: 'gaming' });
    const saved = await ui.savedBuildsService.create(payload);
    const read = await ui.savedBuildsService.get(saved.id);
    assert.deepEqual(read.budget, payload.budget);
    assert.equal(read.usageType, payload.usageType);
    const loaded = ui.hydrateBuildComponents(ui.savedBuildToSelection(read), map);
    assert.deepEqual(ui.buildToApiPayload(loaded), ui.buildToApiPayload(selection));
    assert.equal(read.totalEstimatedPrice, independentTotal(selection));
    assert.equal((await summary(loaded, amount)).totalEstimatedPrice, read.totalEstimatedPrice);
    return { saved, loaded };
  }
  async function journey(profile, execute) {
    const record = { profile, steps: [] }; records.journeys.push(record);
    const step = async (name, run) => { const observed = await run(); record.steps.push({ name, status: 'passed', observed }); };
    await execute(step, record); record.status = 'passed';
    console.log(`${profile}: ${record.steps.length} integrated steps passed`);
  }
  await journey('beginner', async (step, record) => {
    await step('Access home and assistant HTTP routes', async () => [await route('/'), await route('/build')]);
    await step('Select built-in gaming usage and limited reference budget', async () => {
      const customProfiles = await ui.usageProfilesService.list(); assert.ok(Array.isArray(customProfiles));
      return { usageType: 'gaming', amount: 4000, customProfiles: customProfiles.length, note: 'Built-in usage choice; empty custom profiles are not invented presets' };
    });
    await step('Search actual catalog and verify photo delivery/fallback eligibility', async () => {
      const found = ui.filterComponents(catalog, { search: 'ryzen 5', category: 'cpu' }); assert.ok(found.length > 0);
      let photos = 0;
      for (const part of catalog) { const media = ui.verifiedComponentImage(part); if (!media) continue; const response = await fetch(origin + media.imagePath); assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /image\//); assert.ok((await response.arrayBuffer()).byteLength > 100); photos++; }
      assert.equal(photos, 9);
      return { found: found.map(part => part.id), photos, missing: catalog.length - photos, imagePixelsInspected: false };
    });
    let selection;
    await step('Request guidance, recover from insufficient budget and apply recommendation', async () => {
      await assert.rejects(ui.recommendationService.byBudget({ budget: { amount: 100 }, usageType: 'gaming' }), error => error.status === 422);
      const result = await ui.recommendationService.byBudget({ budget: { amount: 4000, priority: 'cost-benefit' }, usageType: 'gaming' });
      selection = ui.recommendationSelection({}, result.components); assert.ok(ui.hasCompleteBuild(selection));
      const guidance = await ui.explanationService.explain({ type: 'recommendation', data: result }); assert.ok(guidance.simpleExplanation.length > 0);
      assert.ok(result.totalEstimatedPrice <= 4000);
      return { componentIds: ui.buildToApiPayload(selection), total: result.totalEstimatedPrice, guidance, comprehension: 'not tested' };
    });
    await step('Consolidate compatibility, estimated performance and budget alerts', async () => {
      const result = await summary(selection, 4000); assert.equal(result.compatibility.compatible, true); assert.ok(result.gamePerformance.estimatedFps > 0); assert.equal(result.totalEstimatedPrice, independentTotal(selection)); assert.equal(result.pricing.marketTotalComplete, false);
      const over = await summary(selection, 100); assert.equal(over.budgetStatus.status, 'over_budget'); assert.equal(over.totalEstimatedPrice, result.totalEstimatedPrice);
      return { total: result.totalEstimatedPrice, compatibility: result.compatibility.status, estimatedFps: result.gamePerformance.estimatedFps, budgetAlert: over.budgetStatus.status, pricing: result.pricing };
    });
    await step('Retain cooling during recommendation and expose unresolved compatibility', async () => {
      const cooler = catalog.find(part => part.category === 'cooler'), fan = catalog.find(part => part.category === 'fan');
      const retained = ui.recommendationSelection({ cooler, fans: [{ ...fan, quantity: 2 }] }, selection);
      assert.equal(retained.cooler.id, cooler.id);
      // Explicit fans: [] in the normalized recommendation means clear, while omitted accessories preserve.
      const { fans: _fans, ...withoutFans } = selection;
      const combined = ui.recommendationSelection({ cooler, fans: [{ ...fan, quantity: 2 }] }, withoutFans);
      assert.equal(combined.fans[0].quantity, 2);
      const pending = await summary(combined, 4000); assert.notEqual(pending.compatibility.compatible, true); assert.equal(pending.gamePerformance.available, false); assert.equal(pending.totalEstimatedPrice, independentTotal(combined));
      const { loaded } = await saveReload('V2.8 cooling pending', combined, 4000); assert.equal(loaded.fans[0].quantity, 2); assert.equal(loaded.cooler.id, cooler.id);
      const blocked = await summary({ ...selection, cpu: map['cpu-ryzen-5-5600'] }, 4000); assert.equal(blocked.compatibility.status, 'incompatible'); assert.equal(blocked.gamePerformance.available, false);
      return { retainedCooler: cooler.id, retainedFan: fan.id, quantity: 2, total: pending.totalEstimatedPrice, compatibility: pending.compatibility.status, alerts: pending.compatibility.alerts, incompatibleStatus: blocked.compatibility.status, fpsSuppressed: true };
    });
    await step('Save final configuration and reload within the process', async () => { const { saved } = await saveReload('V2.8 beginner', selection, 4000); record.finalBuild = saved.components; return { savedId: saved.id, total: saved.totalEstimatedPrice }; });
  });
  await journey('intermediate', async (step, record) => {
    await step('Access catalog and ready-build routes', async () => [await route('/components'), await route('/ready-builds')]);
    await step('Combine brand, specs, price, category and value sorting against real catalog', async () => {
      const filtered = ui.filterComponents(catalog, { category: 'ram', brand: 'Kingston', specs: { memoryType: 'DDR4' }, minPrice: '100', maxPrice: '1000', sort: 'value-desc' });
      assert.ok(filtered.length > 0); for (const part of filtered) { assert.equal(part.brand, 'Kingston'); assert.equal(part.specs.memoryType, 'DDR4'); assert.ok(part.price >= 100 && part.price <= 1000); }
      assert.deepEqual(ui.filterComponents(catalog, { search: 'no-such-model-v28' }), []);
      return filtered.map(part => ({ id: part.id, price: part.price, specs: part.specs, valueIndex: ui.componentValueScore(part) }));
    });
    let selection, before;
    await step('Compare budget alternatives and analyze bottleneck and game', async () => {
      const recommendations = await ui.buildRecommendationService.byBudgetRange({ budgetRange: { min: 4000, max: 6000 }, usageType: 'gaming', priority: 'cost-benefit' });
      const builds = Array.isArray(recommendations) ? recommendations : recommendations.builds || recommendations.recommendations;
      assert.ok(builds.length >= 2); selection = ui.recommendationSelection({}, builds[0].components);
      const compared = await ui.buildComparisonService.compare({ builds: builds.slice(0, 2).map((item, index) => ({ name: `Alternative ${index + 1}`, components: ui.buildToApiPayload(item.components) })), ...settings }); assert.equal(compared.builds.length, 2);
      before = await summary(selection, 6000);
      const bottleneck = await ui.performanceService.analyzeBottlenecks(ui.buildToApiPayload(selection)); assert.ok(bottleneck.performanceSummary.cpuScore > 0);
      const simulation = await ui.performanceService.simulateGame({ build: ui.buildToApiPayload(selection), ...settings }); assert.equal(simulation.estimatedFps, before.gamePerformance.estimatedFps);
      return { alternatives: builds.map(item => ({ total: item.totalEstimatedPrice, components: ui.buildToApiPayload(item.components) })), comparison: compared.recommendedBuild, bottleneck: bottleneck.performanceSummary, estimatedFps: simulation.estimatedFps };
    });
    await step('Verify RAM candidate, replace single slot, compare deltas and undo', async () => {
      const candidate = catalog.find(part => part.category === 'ram' && part.id !== selection.ram.id && part.specs.memoryType === selection.ram.specs.memoryType && part.specs.capacityGb >= selection.ram.specs.capacityGb); assert.ok(candidate);
      const preview = await ui.componentsService.getCatalogCompatibility({ components: ui.buildToApiPayload(selection), category: 'ram' }); assert.equal(preview.find(item => item.componentId === candidate.id).compatible, true);
      const compatibilityMap = Object.fromEntries(preview.map(item => [item.componentId, item]));
      const filtered = ui.filterComponents(catalog, { category: 'ram', compatibility: 'compatible' }, compatibilityMap); assert.ok(filtered.some(item => item.id === candidate.id));
      assert.ok(filtered.every(item => compatibilityMap[item.id].status === 'compatible'));
      const after = await summary({ ...selection, ram: candidate }, 6000);
      const comparison = ui.compareReplacementSummaries(before, after, settings); assert.equal(comparison.cost.delta, Number((candidate.price - selection.ram.price).toFixed(2))); assert.equal(comparison.performance.comparable, true);
      const state = { selectedComponents: selection, revision: 0, budget: { amount: 6000 }, replacementHistory: [] };
      const changed = ui.replaceBuildComponent(state, 'ram', candidate, after, 0); assert.notEqual(changed, state); for (const slot of ['cpu', 'gpu', 'motherboard', 'storage', 'psu', 'case']) assert.deepEqual(changed.selectedComponents[slot], selection[slot]); assert.deepEqual(changed.budget, state.budget);
      const undone = ui.undoBuildReplacement(changed); assert.deepEqual(undone.selectedComponents, selection); assert.equal(undone.summary, null);
      selection = changed.selectedComponents;
      return { from: state.selectedComponents.ram.id, to: candidate.id, comparison, budgetStatus: after.budgetStatus, undoClearedAnalysis: true };
    });
    await step('Save final value choice', async () => { const { saved } = await saveReload('V2.8 intermediate', selection, 6000); record.finalBuild = saved.components; return { savedId: saved.id, total: saved.totalEstimatedPrice }; });
  });
  await journey('experienced', async (step, record) => {
    await step('Access upgrades and saved-build routes', async () => [await route('/upgrades'), await route('/saved-builds')]);
    const ready = await (await fetch(`${origin}/api/v1/ready-builds`)).json();
    let selection = ui.hydrateBuildComponents(ready.data[0].components, map), current;
    await step('Load existing PC saved through actual frontend normalization', async () => { current = await saveReload('V2.8 existing PC', selection, 10000); selection = current.loaded; assert.ok((await ui.savedBuildsService.list()).some(item => item.id === current.saved.id)); return { savedId: current.saved.id, componentIds: ui.buildToApiPayload(selection) }; });
    let suggestions, before;
    await step('Identify current limits and compatible candidate upgrades', async () => {
      before = await summary(selection, 10000);
      suggestions = await ui.upgradeService.suggest({ buildId: current.saved.id, budget: { amount: 1500, priority: 'cost-benefit' }, usageType: 'gaming', priority: 'cost-benefit' }); assert.ok(suggestions.suggestions.length > 0);
      for (const item of suggestions.suggestions) { assert.ok(item.estimatedUpgradeCost <= 1500); const checked = await summary({ ...selection, [item.componentType]: map[item.suggestedComponent.id] }, 10000); assert.equal(checked.compatibility.compatible, true); }
      return { bottleneck: before.bottlenecks.performanceSummary, candidates: suggestions.suggestions };
    });
    await step('Generate sequential upgrade plan within incremental budget', async () => {
      await assert.rejects(ui.upgradeRoadmapService.generate({ build: ui.buildToApiPayload(selection), totalBudget: 2500, maxSteps: 0.5, usageType: 'gaming' }), error => error.status === 400);
      const roadmap = await ui.upgradeRoadmapService.generate({ build: ui.buildToApiPayload(selection), totalBudget: 2500, maxSteps: 3, usageType: 'gaming', priority: 'cost-benefit' }); assert.ok(roadmap.steps.length > 0 && roadmap.steps.length <= 3); assert.ok(roadmap.totalEstimatedCost <= 2500);
      let cumulative = 0;
      for (const step of roadmap.steps) { cumulative += Math.round(step.estimatedCost * 100); assert.equal(step.cumulativeCost, cumulative / 100); const checked = await summary(ui.hydrateBuildComponents(step.buildAfterStep, map), 20000); assert.equal(checked.compatibility.compatible, true); }
      return roadmap;
    });
    await step('Compare selected upgrade value/performance, replace and save independently', async () => {
      const candidate = suggestions.suggestions[0], part = map[candidate.suggestedComponent.id]; const after = await summary({ ...selection, [candidate.componentType]: part }, 10000);
      const comparison = ui.compareReplacementSummaries(before, after, settings); assert.equal(comparison.performance.comparable, true);
      const changed = ui.replaceBuildComponent({ selectedComponents: selection, revision: 0, replacementHistory: [], budget: { amount: 10000 } }, candidate.componentType, part, after, 0); assert.equal(changed.selectedComponents[candidate.componentType].id, part.id);
      const { saved } = await saveReload('V2.8 upgrade choice', changed.selectedComponents, 10000); const original = await ui.savedBuildsService.get(current.saved.id); assert.deepEqual(original.components, current.saved.components); record.finalBuild = saved.components;
      return { originalSavedId: current.saved.id, upgradedSavedId: saved.id, category: candidate.componentType, candidate: part.id, incrementalPurchaseReference: candidate.estimatedUpgradeCost, comparison, originalPreserved: true };
    });
  });
  records.status = 'passed';
  if (process.env.JOURNEY_EVIDENCE_PATH) await writeFile(process.env.JOURNEY_EVIDENCE_PATH, JSON.stringify(records, null, 2) + '\n');
  console.log('All 3 technical journeys passed. Zero browser executions; no participant research.');
} finally { await new Promise(done => { server.close(done); server.closeAllConnections(); }); await rm(temporary, { recursive: true, force: true }); }
