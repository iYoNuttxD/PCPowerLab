import test from 'node:test';
import assert from 'node:assert/strict';
import { isVerifiedPriceObservation, attachDatedReference, getDatedReference } from '../src/data/dated-price-references.js';
import { assessMarketQuote, getProductMarket, referencePrice, summarizeBuildPricing } from '../src/services/marketPriceService.js';
import { datedReference, referenceLabel, knownPriceSubtotal } from '../frontend/src/utils/referencePricing.js';

const now = Date.parse('2026-10-08T14:00:00Z');
const observation = (changes = {}) => ({ productId: 'verified-test', model: 'EXACT-SKU',
  expectedCatalogIdentity: { id: 'verified-test', name: 'Exact SKU', brand: 'Fixture', category: 'ram', partNumber: 'EXACT-SKU', specs: {} },
  snapshotEligible: true, selectedStore: true, price: 100, currency: 'BRL', seller: 'Pichau',
  productUrl: 'https://www.pichau.com.br/exact-sku', referenceScope: 'exact', identityMatch: 'exact',
  availability: 'available', availabilityEvidence: 'Em estoque', verificationMethod: 'rendered_product_page',
  observedAt: '2026-10-08T13:00:00Z', source: { kind: 'manual_public_page_observation', authorizedApi: false }, ...changes });

for (const [name, changes] of [
  ['unknown stock', { availability: 'unknown' }], ['unavailable stock', { availability: 'unavailable' }],
  ['blocked page', { verificationMethod: 'blocked' }], ['search snippet', { verificationMethod: 'search_result' }],
  ['family', { referenceScope: 'family' }], ['benchmark', { referenceScope: 'benchmark' }],
  ['unproven identity', { identityMatch: 'exact_model_retailer_sku_recorded' }],
  ['missing evidence', { availabilityEvidence: '' }], ['missing timestamp', { observedAt: undefined }],
  ['date only', { observedAt: '2026-10-08' }], ['invalid timestamp', { observedAt: 'not-a-date' }],
  ['impossible calendar date', { observedAt: '2026-02-30T13:00:00Z' }],
  ['unrelated model', { model: 'UNRELATED-SKU-999' }],
  ['future timestamp', { observedAt: '2027-01-01T00:00:00Z' }],
  ['API claim', { source: { kind: 'manual_public_page_observation', authorizedApi: true } }],
  ['missing source', { source: undefined }], ['different catalog identity', { expectedCatalogIdentity: { id: 'other' } }],
  ['search URL', { productUrl: 'https://www.pichau.com.br/search?q=exact-sku' }],
  ['home URL', { productUrl: 'https://www.pichau.com.br/' }], ['missing price', { price: null }]
]) test(`manual observation admission rejects ${name}`, () => {
  assert.equal(isVerifiedPriceObservation(observation(changes), now), false);
});

test('exact rendered available observation is eligible, but never an authorized API quote', () => {
  assert.equal(isVerifiedPriceObservation(observation(), now), true);
  assert.equal(isVerifiedPriceObservation(observation({ identityMatch: 'exact_variant' }), now), true);
  assert.notEqual(assessMarketQuote(observation(), 'verified-test', now).status, 'valid');
});

test('unverified and mismatched catalog identities never regain demonstrative amounts', () => {
  for (const id of ['not-in-registry', 'cpu-ryzen-5-7600']) {
    const result = attachDatedReference({ id, name: 'Wrong identity', specs: {}, price: 777 });
    assert.equal(result.price, null);
    assert.equal(result.demonstrativePrice, 777);
    assert.equal(result.priceLabel, 'Sem cotação');
    assert.equal(getDatedReference(result), null);
  }
  const invalidated = { id: 'not-in-registry', price: 777, priceKind: 'dated-reference-snapshot', datedReferenceIdentity: 'obsolete' };
  assert.equal(referencePrice(invalidated).price, null);
});

const quote = (changes = {}) => ({ productId: 'verified-test', externalProductId: 'EXACT-SKU', identityVerified: true,
  storeId: 'test', storeName: 'Test fixture', productUrl: 'https://example.org/product/exact-sku', price: 100,
  currency: 'BRL', availability: 'available', queriedAt: '2026-10-08T12:00:00Z', validUntil: '2026-10-08T15:00:00Z',
  updateStatus: 'success', source: { name: 'Fixture', kind: 'authorized_api', authorized: true,
    reference: 'fixture-not-live', productHosts: ['example.org'] }, ...changes });

test('unknown stock is excluded from offers and a later unknown supersedes available', () => {
  assert.equal(assessMarketQuote(quote({ availability: 'unknown' }), 'verified-test', now).status, 'unknown_availability');
  assert.equal(getProductMarket('verified-test', [quote(), quote({ availability: 'unknown', queriedAt: '2026-10-08T13:00:00Z' })], now).offers.length, 0);
});

test('incomplete coverage exposes a subtotal but never a complete market total', () => {
  const result = summarizeBuildPricing({ cpu: { id: 'verified-test', price: 120 }, gpu: { id: 'unpriced', price: null } }, [quote()], now);
  assert.equal(result.estimatedTotal, null);
  assert.equal(result.knownReferenceSubtotal, 120);
  assert.equal(result.availableMarketQuotesTotal, null);
  assert.equal(result.availableMarketQuotesSubtotal, 100);
  assert.equal(result.marketTotalComplete, false);
  assert.equal(result.observedAvailableReferenceTotal, null);
  assert.equal(summarizeBuildPricing({}, [], now).estimatedTotal, null);
  const estimated = summarizeBuildPricing({ cpu: { id: 'admin-estimate', price: 120, priceKind: 'estimated-reference' } });
  assert.equal(estimated.estimatedTotal, 120);
  assert.equal(estimated.observedAvailableReferenceTotal, null);
  assert.deepEqual(estimated.componentsWithoutVerifiedObservation, ['admin-estimate']);
});

test('frontend labels expose observation timestamp and refuse historical unproven snapshots', () => {
  const fact = observation();
  const component = { id: fact.productId, price: fact.price, priceKind: 'dated-reference-snapshot', pricing: {
    ...fact, observationSource: fact.source, source: 'dated_public_reference', updateStatus: 'dated_snapshot',
    isMarketQuote: false, observedAvailability: fact.availability, availability: 'unknown'
  } };
  assert.ok(datedReference(component));
  assert.match(referenceLabel(component), /08\/10\/2026,? 13:00 UTC/);
  assert.equal(component.pricing.observedAt, '2026-10-08T13:00:00Z');
  for (const change of [{ observedAvailability: 'unknown' }, { referenceScope: 'family' }, { observedAt: undefined }, { observedAt: '2026-10-08' }, { observedAt: '2099-01-01T00:00:00Z' }, { price: 1 }]) {
    const stale = { ...component, pricing: { ...component.pricing, ...change } };
    assert.equal(datedReference(stale), null);
    assert.equal(referenceLabel(stale), 'Sem cotação');
    assert.deepEqual(knownPriceSubtotal({ cpu: stale }), { subtotal: 0, missing: 1 });
  }
});
