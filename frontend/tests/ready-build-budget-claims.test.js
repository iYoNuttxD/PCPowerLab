import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { hydrateBuildComponents } from '../src/utils/buildHelpers.js';
import { componentTypes } from '../src/utils/componentLabels.js';

const source = readFileSync(new URL('../src/pages/ReadyBuilds.jsx', import.meta.url), 'utf8');
function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, name);
  const next = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, next === -1 ? undefined : next);
}
const context = vm.createContext({ componentTypes, hydrateBuildComponents });
for (const name of ['getRecommendationComponents', 'normalizeRecommendationComponents', 'getCurrentBuildPricing', 'getBudgetFitLabel', 'getReadyBuildCompatibility']) {
  vm.runInContext(functionSource(name), context);
}
const prices = [1200, 2100, 800, 600, 800, 650, 833.64];
const components = Object.fromEntries(componentTypes.map((type, index) => [type, { id: type, price: prices[index] }]));
const map = Object.fromEntries(Object.values(components).map(part => [part.id, part]));
const stale = { components: Object.fromEntries(componentTypes.map(type => [type, { id: type, price: 1 }])), estimatedTotalPrice: 5100, targetBudgetRange: { min: 4000, max: 5500 } };

test('current catalog total replaces an obsolete estimate while the original target stays explicit', () => {
  const result = context.getCurrentBuildPricing(stale, map);
  assert.equal(result.total, 6983.64);
  assert.equal(result.complete, true);
  assert.equal(context.getBudgetFitLabel(result, stale.targetBudgetRange), 'Acima da faixa informada');
  assert.equal(context.getBudgetFitLabel(result, { max: 5000 }, true), 'Acima do seu orçamento');
  assert(source.includes('Faixa-alvo original'));
  assert(source.includes('getBudgetFitLabel(pricing, readyBuild.targetBudgetRange)'));
  assert.deepEqual(stale.targetBudgetRange, { min: 4000, max: 5500 });
});

test('unknown legacy prices cannot fall back to saved estimates or claim budget fit', () => {
  const result = context.getCurrentBuildPricing(stale, { ...map, ram: { id: 'ram', price: null, estimatedPrice: 1, catalogStatus: 'legacy' } });
  assert.equal(context.getCurrentBuildPricing(stale, {}).total, null);
  assert.equal(result.total, null);
  assert.equal(result.complete, false);
  assert.equal(result.knownTotal, 6383.64);
  assert.equal(context.getBudgetFitLabel(result, { min: 1, max: 99999 }), 'Preço incompleto: orçamento não verificado');
  assert.equal(context.getCurrentBuildPricing({ components: { cpu: components.cpu } }, map).complete, false);
});

test('fan pack quantities contribute to current total and missing cooling prices remain incomplete', () => {
  const build = { components: { ...components, cooler: { id: 'cooler' }, fans: [{ fanId: 'fan', quantity: 3 }] } };
  const coolingMap = { ...map, cooler: { id: 'cooler', price: 200 }, fan: { id: 'fan', price: 100 } };
  assert.equal(context.getCurrentBuildPricing(build, coolingMap).total, 7483.64);
  assert.equal(context.getCurrentBuildPricing(build, { ...coolingMap, fan: { id: 'fan', price: null } }).total, null);
});

test('budget fit is based on complete actual total and explicitly entered bounds', () => {
  const result = context.getCurrentBuildPricing(stale, map);
  assert.equal(context.getBudgetFitLabel(result, { min: 6000, max: 6983.64 }), 'Dentro da faixa informada');
  assert.equal(context.getBudgetFitLabel(result, { min: 7000, max: 8000 }), 'Abaixo da faixa informada');
  assert.equal(context.getBudgetFitLabel(result, { max: '' }, true), 'Orçamento não informado');
  assert(!source.includes("recommendation.budgetStatus || 'compatible'"));
});

test('preset apply, editing and preview never replace the user budget with a template limit', () => {
  const apply = source.slice(source.indexOf('  function applyReadyBuild('), source.indexOf('  function openReadyBuildFeedback('));
  const preview = source.slice(source.indexOf('  function previewComponent('), source.indexOf('  function applyUsageProfile('));
  assert(!apply.includes('setBudget'));
  assert(!apply.includes('targetBudgetRange'));
  assert(!preview.includes('setBudget'));
  assert(source.includes("applyReadyBuild(detailsBuild, '/build')"));
});

test('preset compatibility is never claimed without positive evidence', () => {
  assert.equal(context.getReadyBuildCompatibility({}), 'unverified');
  assert.equal(context.getReadyBuildCompatibility({ compatibility: { status: 'compatible', compatible: true } }), 'compatible');
  assert.equal(context.getReadyBuildCompatibility({ compatibility: { compatible: true, unverifiedChecks: [{}] } }), 'unverified');
  assert.equal(context.getReadyBuildCompatibility({ compatibility: { compatible: false, status: 'unverified' } }), 'unverified');
  assert.equal(context.getReadyBuildCompatibility({ compatibility: { compatible: false, status: 'incompatible', unverifiedChecks: [{}] } }), 'incompatible');
});
