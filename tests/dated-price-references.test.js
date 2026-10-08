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

test('78 scoped research references propagate effective prices and preserve demonstrative originals', () => {
  assert.equal(datedReferenceCount, 78);
  const covered = listComponents().filter(c => c.pricing.updateStatus === 'dated_snapshot');
  assert.equal(covered.length, 78);
  for (const component of covered) {
    assert.equal(component.price, component.pricing.price);
    assert.equal(component.pricing.isMarketQuote, false);
    assert.equal(component.pricing.validUntil, null);
    assert.equal(component.pricing.availability, 'unknown');
    assert.ok(component.pricing.seller && component.pricing.model && component.pricing.paymentCondition);
    assert.doesNotMatch(JSON.stringify(component.pricing), /\/tmp\/|\/workspace\/|mappingProposal|researchDetail|catalogEvidence/);
    assert.equal(component.pricing.source, 'dated_public_reference');
    assert.ok(component.demonstrativePrice > 0);
    assert.equal(getProductMarket(component.id).offers.length, 0);
    assert.notEqual(assessMarketQuote(component.pricing, component.id).status, 'valid');
  }
  assert.equal(findComponentById('cpu-ryzen-5-7600').price, 999.99);
  assert.equal(findComponentById('gpu-rtx-4060').price, 2199.99);
  assert.equal(findComponentById('gpu-rtx-4060').pricing.updateStatus, 'dated_snapshot');
});
test('an observed available record never becomes a live market quote', () => {
  const component = findComponentById('ram-kf432c16bbk2-16');
  assert.equal(component.pricing.observedAvailability, 'available');
  assert.equal(component.pricing.availability, 'unknown');
  assert.equal(component.price, 1699.9);
  assert.equal(component.pricing.cardTotal, 1999.88);
});
test('totals use effective reference prices; coverage counts fan packs; card and market remain separate', () => {
  const build = { cpu: findComponentById('cpu-ryzen-5-7600'), gpu: findComponentById('gpu-rtx-4060'), fans: [{ ...findComponentById('fan-noctua-nf-a14-pwm'), quantity: 2 }] };
  const result = summarizeBuildPricing(build);
  assert.equal(result.estimatedTotal, 3589.96);
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
    assert.equal(link.price, 999.99);
    assert.equal(link.referencePricing.store, 'Pichau');
  }
});
test('mismatched identity or admin price cannot reuse a dated source', () => {
  const c = findComponentById('cpu-ryzen-5-7600');
  for (const edit of [{ id: 'fake' }, { name: 'Different CPU' }, { brand: 'Other' }, { partNumber: 'Other' }, { price: 1 }, { specs: {} }]) {
    const modified = { ...c, ...edit };
    assert.equal(getDatedReference(modified), null);
    assert.equal(referencePrice(modified).updateStatus, 'estimate');
  }
  assert.equal(attachDatedReference({ ...c, price: c.demonstrativePrice, name: 'Other' }).price, c.demonstrativePrice);
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


test('effective catalogue equals 78 independently frozen reviewed source facts', () => {
  const facts = JSON.parse(readFileSync(new URL('./helpers/approved-price-facts.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(facts).length, 78);
  for (const [id, fact] of Object.entries(facts)) {
    const component = findComponentById(id);
    assert.equal(component.price, fact.price, id);
    assert.equal(component.pricing.model, fact.sku, id);
    assert.equal(component.pricing.seller, fact.seller, id);
  }
  // Frozen seven-part source facts: price changes are deliberate source updates, not self-derived expectations.
  const ids = ['cpu-ryzen-5-5600', 'mb-b550m-aorus-elite', 'gpu-rtx-4060', 'ram-kingston-fury-16gb-ddr4', 'ssd-kingston-nv2-1tb', 'psu-corsair-650w', 'case-mid-tower-airflow'];
  assert.deepEqual(ids.map(id => findComponentById(id).price), [899.99, 699.99, 2199.99, 1799.99, 499.99, 443.7, 439.99]);
  assert.equal(ids.reduce((cents, id) => cents + Math.round(findComponentById(id).price * 100), 0), 698364);
});


test('reference identities separate exact products, family variants and illustrative examples', () => {
  const dated = listComponents().filter(component => component.pricing.updateStatus === 'dated_snapshot');
  assert.equal(dated.filter(component => component.pricing.referenceScope === 'exact').length, 49);
  assert.equal(dated.filter(component => component.pricing.referenceScope === 'family').length, 25);
  assert.equal(dated.filter(component => component.pricing.referenceScope === 'benchmark').length, 4);
  for (const component of dated.filter(component => component.pricing.referenceScope !== 'exact')) {
    assert.ok(component.pricing.sourceVariantName && component.pricing.model);
    assert.equal(component.pricing.isMarketQuote, false);
  }
  const gpu = findComponentById('gpu-rtx-4060');
  assert.equal(gpu.name, 'NVIDIA GeForce RTX 4060 8GB');
  assert.equal(gpu.pricing.model, 'ZT-D40600G-10L');
  assert.notEqual(gpu.partNumber, gpu.pricing.model, 'Research must not silently adopt commercial variant specs');
});

test('twenty unverified prices remain absent, not demonstrative prices sold as real', () => {
  const missing = listComponents().filter(component => component.price == null);
  assert.equal(missing.length, 20);
  for (const component of missing) {
    assert.equal(component.priceKind, 'unavailable');
    assert.equal(component.pricing.price, null);
    assert.equal(getDatedReference(component), null);
  }
});
