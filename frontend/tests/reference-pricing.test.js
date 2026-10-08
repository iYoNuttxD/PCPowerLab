import test from 'node:test';
import assert from 'node:assert/strict';
import { datedReference, referenceCoverage, referenceLabel, knownPriceSubtotal } from '../src/utils/referencePricing.js';
const observedAt = '2026-10-08T14:32:46.643Z';
const component = {
  id: 'ram-kf436c17bbk2-16', price: 1759.9,
  pricing: {
    price: 1759.9, updateStatus: 'dated_snapshot', source: 'dated_public_reference',
    isMarketQuote: false, queriedAt: observedAt, observedAt,
    referenceScope: 'exact', identityMatch: 'exact_variant',
    verificationMethod: 'rendered_product_page', observedAvailability: 'available',
    availabilityEvidence: 'Pronta entrega; enabled COMPRAR AGORA',
    observationSource: { kind: 'manual_public_page_observation', authorizedApi: false },
    sourceUrl: 'https://www.terabyteshop.com.br/produto/19156/memoria-kingston-fury-beast-16gb-3600mhz-ddr4-cl17-preto-kf436c17bbk216'
  }
};
test('dated badge refuses saved old price paired with new pricing metadata', () => {
  assert.ok(datedReference(component));
  assert.equal(datedReference({ ...component, price: 10 }), null);
  assert.equal(datedReference({ ...component, pricing: { ...component.pricing, isMarketQuote: true } }), null);
  assert.equal(referenceLabel({ id: 'old', price: 10 }), 'Estimativa do catálogo');
});
test('compact price labels retain source date and never claim current quotes', () => {
  const visibleTime = `${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(observedAt))} UTC`;
  assert.equal(referenceLabel({ ...component, pricing: { ...component.pricing, store: 'Loja' } }), `Referência PIX · Loja · ${visibleTime}`);
  assert.equal(referenceLabel(component), `Referência PIX · ${visibleTime}`);
});
test('coverage separates dated and demonstrative pack counts', () => {
  assert.deepEqual(referenceCoverage({ cpu: component, gpu: { id: 'b', price: 100 }, fans: [{ ...component, quantity: 3 }] }), { dated: 4, estimated: 1, total: 5 });
  assert.deepEqual(referenceCoverage(), { dated: 0, estimated: 0, total: 0 });
});

test('unpriced selection keeps a partial subtotal and never displays a zero price', () => {
  assert.equal(referenceLabel({ id: 'missing', price: null }), 'Sem cotação');
  assert.deepEqual(knownPriceSubtotal({ cpu: { id: 'a', price: 12.34 }, gpu: { id: 'b', price: null }, fans: [{ id: 'f', price: 2.1, quantity: 3 }] }), { subtotal: 18.64, missing: 1 });
  assert.deepEqual(knownPriceSubtotal({ cpu: { id: 'a', price: null } }), { subtotal: 0, missing: 1 });
});

test('a dated badge requires exact identity, rendered available proof, source and a full valid timestamp', () => {
  const invalidProof = [
    { referenceScope: undefined }, { referenceScope: 'family' },
    { identityMatch: 'similar' }, { identityMatch: undefined },
    { verificationMethod: 'search_snippet' }, { verificationMethod: undefined },
    { observedAvailability: 'unavailable' }, { observedAvailability: 'unknown' },
    { availabilityEvidence: '' }, { availabilityEvidence: '   ' },
    { observationSource: undefined },
    { observationSource: { kind: 'manual_public_page_observation', authorizedApi: true } },
    { observationSource: { kind: 'search_result', authorizedApi: false } },
    { observedAt: undefined }, { observedAt: '2026-10-08' },
    { observedAt: 'invalid' }, { observedAt: '2026-02-30T13:00:00Z' }, { observedAt: '2999-01-01T00:00:00Z' }
  ];
  for (const mutation of invalidProof) {
    const invalid = { ...component, pricing: { ...component.pricing, ...mutation } };
    const message = JSON.stringify(mutation);
    assert.equal(datedReference(invalid), null, message);
    assert.equal(referenceLabel(invalid), 'Sem cotação', message);
    assert.deepEqual(referenceCoverage({ ram: invalid }), { dated: 0, estimated: 0, total: 0 }, message);
    assert.deepEqual(knownPriceSubtotal({ ram: invalid }), { subtotal: 0, missing: 1 }, message);
  }
});
