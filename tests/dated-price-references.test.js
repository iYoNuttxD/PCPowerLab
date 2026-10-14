import { replacementCatalog } from '../src/data/catalogReplacements.js';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { components } from '../src/data/components.mock.js';
import { attachDatedReference, getDatedReference, datedReferenceCount } from '../src/data/dated-price-references.js';
import { listComponents, findComponentById } from '../src/services/component.service.js';
import { updateComponentRecord } from '../src/data/component.repository.js';
import { referencePrice, assessMarketQuote, summarizeBuildPricing, getProductMarket } from '../src/services/marketPriceService.js';
import { getPurchaseLinksByComponentId } from '../src/services/purchaseLinksService.js';
import { calculateBuildPrice } from '../src/services/build.service.js';
const currentFacts = JSON.parse(readFileSync(new URL('./fixtures/current-market-source-facts.json', import.meta.url), 'utf8'));
const currentFactCount = Object.keys(currentFacts).length;

test('scoped research references propagate effective prices and preserve historical demonstrative values', () => {
  assert.equal(datedReferenceCount, currentFactCount);
  const covered = listComponents().filter(c => c.pricing.updateStatus === 'dated_snapshot');
  assert.equal(covered.length, currentFactCount);
  for (const component of covered) {
    assert.equal(component.price, component.pricing.price);
    assert.equal(component.pricing.isMarketQuote, false);
    assert.equal(component.pricing.validUntil, null);
    assert.equal(component.pricing.availability, 'unknown');
    assert.ok(component.pricing.seller && component.pricing.model && component.pricing.paymentCondition);
    assert.doesNotMatch(JSON.stringify(component.pricing), /\/tmp\/|\/workspace\/|mappingProposal|researchDetail|catalogEvidence/);
    assert.equal(component.pricing.source, 'dated_public_reference');
    if (component.catalogRevision) assert.equal(component.demonstrativePrice, null);
    else assert.ok(component.demonstrativePrice > 0);
    assert.equal(getProductMarket(component.id).offers.length, 0);
    assert.notEqual(assessMarketQuote(component.pricing, component.id).status, 'valid');
  }
  assert.equal(findComponentById('cpu-ryzen-5-7600').price, 999.98);
  assert.equal(findComponentById('gpu-rtx-4060').price, null);
  assert.equal(findComponentById('gpu-rtx-4060').pricing.updateStatus, 'estimate');
});
test('an observed available record never becomes a live market quote', () => {
  const component = findComponentById('ram-kf432c16bbk2-16');
  assert.equal(component.pricing.observedAvailability, 'available');
  assert.equal(component.pricing.availability, 'unknown');
  assert.equal(component.price, 1699.9);
  assert.equal(component.pricing.cardTotal, null);
});
test('totals use effective reference prices; coverage counts fan packs; card and market remain separate', () => {
  const build = { cpu: findComponentById('cpu-ryzen-5-7600'), gpu: findComponentById('gpu-msi-rtx-4060-ventus-2x-black-8g-oc'), fans: [{ ...findComponentById('fan-noctua-nf-a14-pwm'), quantity: 2 }] };
  const result = summarizeBuildPricing(build);
  assert.equal(result.estimatedTotal, 4714.01);
  assert.equal(calculateBuildPrice(build), result.estimatedTotal);
  assert.equal(result.datedReferenceUnits, 4);
  assert.equal(result.estimatedReferenceUnits, 0);
  assert.equal(result.basis, 'dated_reference');
  assert.equal(result.availableMarketQuotesTotal, null);
});
test('references do not turn five store search links into invented store offers', () => {
  const links = getPurchaseLinksByComponentId('cpu-ryzen-5-7600');
  assert.equal(links.length, 5);
  for (const link of links) {
    assert.equal(link.kind, 'research');
    assert.equal(link.productUrl, null);
    assert.equal(link.price, 999.98);
    assert.equal(link.referencePricing.store, 'KaBuM');
  }
});
test('mismatched identity or admin price cannot reuse a dated source', () => {
  const c = findComponentById('cpu-ryzen-5-7600');
  for (const edit of [{ id: 'fake' }, { name: 'Different CPU' }, { brand: 'Other' }, { partNumber: 'Other' }, { price: 1 }, { specs: {} }]) {
    const modified = { ...c, ...edit };
    assert.equal(getDatedReference(modified), null);
    assert.equal(referencePrice(modified).updateStatus, 'estimate');
  }
  assert.equal(attachDatedReference({ ...c, price: c.demonstrativePrice, name: 'Other' }).price, null);
});
test('repository invalidates edited amounts and clears old amount on identity edits', () => {
  const id = 'cpu-ryzen-5-7600';
  const index = components.findIndex(c => c.id === id), original = JSON.parse(JSON.stringify(components[index]));
  try {
    updateComponentRecord(id, { price: 1234 });
    assert.equal(findComponentById(id).pricing.updateStatus, 'estimate');
    assert.equal(findComponentById(id).price, 1234);
    components[index] = JSON.parse(JSON.stringify(original));
    updateComponentRecord(id, { name: 'Replacement CPU' });
    assert.equal(findComponentById(id).price, null);
    assert.equal(findComponentById(id).pricing.updateStatus, 'estimate');
    components[index] = JSON.parse(JSON.stringify(original));
    updateComponentRecord(id, { active: false });
    assert.ok(getDatedReference(components[index]));
  } finally { components[index] = original; }
});


test('effective catalogue equals independently reviewed exact available observations', () => {
  const facts = currentFacts;
  assert.deepEqual(listComponents().map(component => component.id).sort(), Object.keys(facts).sort());
  for (const [id, fact] of Object.entries(facts)) {
    const component = findComponentById(id);
    assert.equal(component.price, fact.price, id);
    assert.equal(component.pricing.model, fact.model, id);
    assert.equal(component.pricing.seller, fact.seller, id);
  }
});

test('only exact identities retain references; historical family variants remain distinct', () => {
  const dated = listComponents().filter(component => component.pricing.updateStatus === 'dated_snapshot');
  assert.equal(dated.length, currentFactCount);
  assert.equal(dated.every(component => component.pricing.referenceScope === 'exact'), true);
  const gpu = findComponentById('gpu-rtx-4060');
  assert.equal(gpu.name, 'NVIDIA GeForce RTX 4060 8GB');
  assert.equal(gpu.price, null);
  assert.equal(getDatedReference(gpu), null);
});

test('historical unverified or unavailable prices remain absent after retirement', () => {
  const missing = listComponents({ includeLegacy: true }).filter(component => component.price == null);
  assert.equal(missing.length, 79);
  for (const component of missing) {
    assert.equal(component.catalogStatus, 'legacy');
    assert.equal(component.priceKind, 'unavailable');
    assert.equal(component.pricing.price, null);
    assert.equal(getDatedReference(component), null);
  }
});

test('new replacement payment conditions use Portuguese and keep their verified numerical facts', () => {
  for (const model of replacementCatalog) {
    const component = findComponentById(model.id);
    assert.doesNotMatch(`${component.pricing.paymentCondition} ${component.pricing.installments}`, /discount|interest-free|or boleto|terms not inspected/);
    assert.equal(component.price, component.pricing.price);
    assert.equal(component.partNumber, component.pricing.model);
  }
});
