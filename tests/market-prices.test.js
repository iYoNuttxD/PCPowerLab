import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMarketQuote, getProductMarket, summarizeBuildPricing, referencePrice, marketIntegrationStatus } from '../src/services/marketPriceService.js';
import { listComponents } from '../src/services/component.service.js';
import { getPurchaseLinksByComponentId } from '../src/services/purchaseLinksService.js';
const now = Date.parse('2026-10-08T12:00:00Z');
const quote = (changes = {}) => ({ productId: 'cpu-test', externalProductId: 'fixture-sku', identityVerified: true, storeId: 'store-a', storeName: 'Test fixture A', productUrl: 'https://example.org/product/cpu-test', price: 100, currency: 'BRL', availability: 'available', queriedAt: '2026-10-08T10:00:00Z', validUntil: '2026-10-08T13:00:00Z', updateStatus: 'success', source: { name: 'Synthetic authorized-provider fixture', kind: 'authorized_api', authorized: true, reference: 'fixture-not-a-live-provider', productHosts: ['example.org'] }, ...changes });

test('no provider or real offer is invented for catalog and research links', () => {
  assert.equal(marketIntegrationStatus.connected, false);
  assert.equal(getProductMarket('cpu-test').offers.length, 0);
  for (const component of listComponents()) {
    assert.equal(component.pricing.isMarketQuote, false);
    assert.equal(component.pricing.queriedAt, component.pricing.updateStatus === 'dated_snapshot' ? '2026-10-08' : null);
    assert.equal(component.pricing.validUntil, null);
    for (const link of getPurchaseLinksByComponentId(component.id)) {
      assert.equal(link.kind, 'research'); assert.equal(link.productUrl, null);
      assert.equal(link.lastUpdated, null); assert.equal(link.updateStatus, 'not_queried');
    }
  }
});
for (const [name, changes, status] of [
  ['stale', { validUntil: '2026-10-08T11:00:00Z' }, 'stale'],
  ['unavailable', { availability: 'unavailable' }, 'unavailable'],
  ['source error', { updateStatus: 'source_error' }, 'source_error'],
  ['mock', { updateStatus: 'estimate' }, 'mock'],
  ['untrusted', { source: {} }, 'invalid'],
  ['identity unverified', { identityVerified: false }, 'invalid'],
  ['unauthorized host', { productUrl: 'https://wrong.example/product/cpu' }, 'invalid'],
  ['wrong product', { productId: 'another' }, 'invalid'],
  ['invalid price', { price: -2 }, 'invalid'],
  ['numeric text', { price: '100' }, 'invalid'],
  ['other currency', { currency: 'USD' }, 'invalid'],
  ['missing date', { queriedAt: null }, 'invalid'],
  ['future date', { queriedAt: '2027-10-08T10:00:00Z' }, 'invalid'],
  ['missing validity', { validUntil: null }, 'invalid'],
  ['search URL', { productUrl: 'https://example.org/search?q=cpu' }, 'invalid'],
  ['unsafe URL', { productUrl: 'javascript:alert(1)' }, 'invalid'],
  ['unknown stock', { availability: 'unknown' }, 'valid']
]) test(`market quote ${name}`, () => assert.equal(assessMarketQuote(quote(changes), 'cpu-test', now).status, status));
test('missing quote and reference remain missing, never zero', () => {
  assert.equal(assessMarketQuote(null, 'cpu-test', now).status, 'invalid');
  assert.equal(referencePrice({ id: 'missing' }).price, null);
  const summary = summarizeBuildPricing({ cpu: { id: 'missing' } });
  assert.equal(summary.estimatedTotal, null); assert.equal(summary.availableMarketQuotesTotal, null);
});
test('single store cannot claim automatic comparison, multi store sorts by valid price', () => {
  assert.equal(getProductMarket('cpu-test', [quote()], now).comparisonAvailable, false);
  const data = getProductMarket('cpu-test', [quote(), quote({ storeId: 'store-b', price: 90 }), quote({ storeId: 'bad', price: 1, updateStatus: 'source_error' })], now);
  assert.equal(data.comparisonAvailable, true); assert.deepEqual(data.offers.map(x => x.price), [90, 100]);
});
test('newer unavailable observation suppresses old quote from same seller', () => {
  const data = getProductMarket('cpu-test', [quote(), quote({ availability: 'unavailable', queriedAt: '2026-10-08T11:00:00Z' })], now);
  assert.equal(data.offers.length, 0);
});
test('mixed market/reference totals are separate, fan packs counted, unknown stock excluded', () => {
  const build = { cpu: { id: 'cpu-test', price: 120 }, gpu: { id: 'gpu-test', price: 300 }, fans: [{ id: 'fan-test', price: 20, quantity: 3 }] };
  const data = summarizeBuildPricing(build, [quote(), quote({ productId: 'fan-test', price: 10 }), quote({ productId: 'gpu-test', price: 200, availability: 'unknown' })], now);
  assert.equal(data.estimatedTotal, 480); assert.equal(data.availableMarketQuotesTotal, 130);
  assert.equal(data.marketTotalComplete, false); assert.deepEqual(data.componentsWithoutCurrentQuote, ['gpu-test']);
});
