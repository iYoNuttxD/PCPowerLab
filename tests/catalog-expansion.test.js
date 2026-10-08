import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { components } from '../src/data/components.mock.js';
import { performanceParameters } from '../src/data/performanceParameters.js';
import { readyBuilds } from '../src/data/readyBuilds.js';
import { generateBuildSummary } from '../src/services/buildSummaryService.js';
import { calculateBuildScore } from '../src/services/buildScoreService.js';
import { checkBuildCompatibility } from '../src/services/compatibility.service.js';
import { getPurchaseLinksByComponentId } from '../src/services/purchaseLinksService.js';

const additions = components.filter(component => component.specSourceUrl && ['ram', 'storage'].includes(component.category));
const reference = readyBuilds[0].components;
// Reviewed source facts are an independent price oracle, not the service output under test.
const priceFacts = JSON.parse(readFileSync(new URL('./helpers/approved-price-facts.json', import.meta.url), 'utf8'));

for (const component of additions) {
  test(`catalogo ampliado: ${component.id} participa de compatibilidade, orçamento e desempenho`, () => {
    const selection = { ...reference, [`${component.category}Id`]: component.id };
    if (component.specs.memoryType === 'DDR5') {
      selection.cpuId = 'cpu-ryzen-5-7600';
      selection.motherboardId = 'mb-asus-prime-b650m-a';
    }
    const summary = generateBuildSummary({ build: selection, budget: { amount: 1000, priority: 'cost-benefit' }, usageType: 'gaming', gameId: 'game-cyberpunk-2077', targetResolution: '1080p', qualityPreset: 'high' });
    assert.equal(summary.compatibility.compatible, true);
    assert.equal(summary.bottlenecks.available, undefined);
    assert.equal(Number.isFinite(summary.gamePerformance.estimatedFps), true);
    const selectedIds = Object.values(selection);
    const missingIds = selectedIds.filter(id => !Object.hasOwn(priceFacts, id));
    const knownSubtotal = selectedIds.filter(id => Object.hasOwn(priceFacts, id))
      .reduce((cents, id) => cents + Math.round(priceFacts[id].price * 100), 0) / 100;
    const total = missingIds.length ? null : knownSubtotal;
    assert.equal(component.price, priceFacts[component.id]?.price ?? null);
    assert.equal(summary.totalEstimatedPrice, total);
    assert.equal(summary.pricing.knownReferenceSubtotal, knownSubtotal);
    assert.equal(summary.pricing.referenceTotalComplete, missingIds.length === 0);
    assert.deepEqual([...summary.pricing.componentsWithoutReference].sort(), [...missingIds].sort());
    assert.equal(summary.budgetStatus.status, missingIds.length ? 'unavailable' : 'over_budget');
    assert.equal(summary.budgetStatus.remaining, missingIds.length ? null : Number((1000 - total).toFixed(2)));
    const score = calculateBuildScore({ build: selection, budget: { amount: 1000, priority: 'cost-benefit' }, usageType: 'gaming' });
    assert.equal(score.criteria.compatibilityScore, 100);
    assert.ok(score.criteria.performanceScore > 0);
    assert.equal(score.available, missingIds.length === 0);
    if (missingIds.length) {
      assert.equal(score.overallScore, null);
      assert.equal(score.criteria.budgetScore, null);
      assert.equal(score.criteria.costBenefitScore, null);
      assert.ok(score.warnings.some(warning => /sem preço de referência/.test(warning)));
    } else {
      assert.equal(Number.isInteger(score.overallScore), true);
      assert.equal(score.overallScore >= 0 && score.overallScore <= 100, true);
      assert.equal(score.warnings, undefined);
    }
    const parameter = performanceParameters.find(entry => entry.componentId === component.id);
    assert.equal(parameter.capacity, component.specs.capacityGb);
    if (component.category === 'ram') assert.equal(parameter.memoryType, component.specs.memoryType);
    else assert.equal(parameter.interface, component.specs.interface);
    const links = getPurchaseLinksByComponentId(component.id);
    assert.equal(links.length, 5);
    assert.equal(links.every(link => link.price === component.price && link.availabilityStatus === 'unknown'), true);
  });
}

test('nova DDR5 continua incompatível com placa-mãe DDR4', () => {
  const result = checkBuildCompatibility({ ...reference, ramId: 'ram-kingston-fury-16gb-ddr5-5200' });
  assert.equal(result.compatible, false);
  assert.equal(result.alerts.some(alert => alert.code === 'RAM_MOTHERBOARD_TYPE_INCOMPATIBLE'), true);
});

test('armazenamento novo não ignora interface incompatível cadastrada na placa-mãe', () => {
  const board = components.find(component => component.id === reference.motherboardId);
  const original = board.specs.storageInterfaces;
  try {
    board.specs.storageInterfaces = ['SATA'];
    const result = checkBuildCompatibility({ ...reference, storageId: 'ssd-samsung-980-pro-1tb' });
    assert.equal(result.compatible, false);
    assert.equal(result.alerts.some(alert => alert.code === 'STORAGE_INTERFACE_INCOMPATIBLE'), true);
  } finally {
    board.specs.storageInterfaces = original;
  }
});
