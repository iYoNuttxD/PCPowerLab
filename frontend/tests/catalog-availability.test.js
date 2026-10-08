import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogView, isSelectableComponent, suggestedReplacement } from '../src/utils/catalogAvailability.js';
import { validateCatalogResponse } from '../src/utils/catalogResponse.js';
import { reconcileBuildCatalog } from '../src/utils/buildTransitions.js';
import { selectCatalogComponent } from '../src/utils/catalogSelection.js';
const legacy = { id: 'old-board', name: 'Original board', category: 'motherboard', price: null, active: false, catalogStatus: 'legacy', selectable: false, replacementId: 'new-board', specs: { socket: 'AM5' } };
const current = { id: 'new-board', name: 'New board', category: 'motherboard', price: 1200, active: true, catalogStatus: 'active', selectable: true, specs: { socket: 'AM5' } };

test('active catalog choices exclude legacy and inactive records while history can resolve legacy identity', () => {
  const inactive = { id: 'private-inactive', category: 'cpu', active: false, catalogStatus: 'inactive', selectable: false };
  const view = catalogView(validateCatalogResponse([legacy, current, inactive]));
  assert.deepEqual(view.components.map(item => item.id), ['new-board']);
  assert.deepEqual(view.allComponents.map(item => item.id), ['old-board', 'new-board']);
  assert.equal(view.componentMap['old-board'], legacy);
  assert.equal(view.componentMap['private-inactive'], undefined);
  assert.equal(isSelectableComponent(legacy), false);
});

test('loading an old build and its undo history never substitutes a new model silently', () => {
  const receipt = { motherboard: { ...legacy }, fans: [] };
  const state = { selectedComponents: receipt, replacementHistory: [receipt], budget: { amount: 5000 }, revision: 2 };
  const refreshed = reconcileBuildCatalog(state, catalogView([legacy, current]).componentMap);
  assert.equal(refreshed.selectedComponents.motherboard.id, 'old-board');
  assert.equal(refreshed.selectedComponents.motherboard.catalogStatus, 'legacy');
  assert.deepEqual(refreshed.selectedComponents.motherboard.specs, { socket: 'AM5' });
  assert.equal(refreshed.selectedComponents.motherboard.price, null);
  assert.equal(refreshed.replacementHistory[0].motherboard.id, 'old-board');
  assert.equal(refreshed.budget, state.budget);
  assert.equal(receipt.motherboard.id, 'old-board');
});

test('a replacement is only a same-category active suggestion and selection remains explicit', () => {
  const map = catalogView([legacy, current]).componentMap;
  assert.equal(suggestedReplacement(legacy, map), current);
  assert.equal(suggestedReplacement(legacy, { ...map, 'new-board': { ...current, category: 'cpu' } }), null);
  assert.equal(suggestedReplacement(legacy, { ...map, 'new-board': { ...current, selectable: false } }), null);
  const calls = []; const actions = { selectComponent: (...args) => calls.push(args) };
  assert.equal(selectCatalogComponent({}, actions, legacy), false);
  assert.deepEqual(calls, []);
  assert.equal(selectCatalogComponent({ motherboard: legacy }, actions, current), true);
  assert.equal(calls[0][1].id, 'new-board');
});

test('malformed legacy and replacement metadata is rejected before rendering', () => {
  for (const change of [{ catalogStatus: 'surprise' }, { selectable: 'false' }, { replacementId: {} }, { replacement: { id: 'new-board', name: {}, category: 'motherboard', requiresSelection: true } }]) {
    assert.throws(() => validateCatalogResponse([{ ...legacy, ...change }]), /Resposta inválida/);
  }
});
