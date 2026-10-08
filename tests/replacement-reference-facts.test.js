import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { findComponentById } from '../src/services/component.service.js';
// Frozen retail observations are independent of runtime pricing calculations.
const facts = JSON.parse(readFileSync(new URL('./fixtures/replacement-source-facts.json', import.meta.url), 'utf8'));
for (const [id, fact] of Object.entries(facts)) test(`replacement retail fact remains attached to exact SKU: ${id}`, () => {
  const component = findComponentById(id);
  assert.equal(component.price, fact.price);
  assert.equal(component.partNumber, fact.model);
  assert.equal(component.pricing.model, fact.model);
  assert.equal(component.pricing.seller, fact.seller);
  assert.equal(component.pricing.store, fact.store);
  assert.equal(component.pricing.observedAvailability, fact.availability);
  assert.equal(component.pricing.availability, 'unknown');
  assert.equal(component.pricing.isMarketQuote, false);
  assert.equal(component.pricing.validUntil, null);
});
