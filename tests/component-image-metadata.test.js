import test from 'node:test';
import assert from 'node:assert/strict';
import { attachComponentImage } from '../src/data/component-images.js';
import { components } from '../src/data/components.mock.js';
import { addComponentRecord, updateComponentRecord } from '../src/data/component.repository.js';

test('all active catalog products expose exact-ID image state without fabricated coverage', () => {
  for (const component of components.filter(item => item.active !== false)) {
    assert.equal(component.image.componentId, component.id);
    assert.ok(['verified', 'blocked'].includes(component.image.status));
    if (component.image.status === 'verified') {
      assert.equal(component.image.imageType, 'photo');
      assert.match(component.image.imagePath, /^\/images\/components\//);
      assert.ok(component.image.rightsBasis);
    } else {
      assert.equal(component.image.imagePath, null);
      assert.equal(component.image.lastVerifiedAt, null);
      assert.ok(component.image.blocker);
    }
  }
});

test('new admin records cannot self-attest a photo; variant edits invalidate exact-model claims', () => {
  const original = JSON.parse(JSON.stringify(components.find(item => item.image.status === 'verified')));
  const id = 'image-test-runtime-component';
  try {
    const created = addComponentRecord({ ...original, id });
    assert.equal(created.image.status, 'blocked');
    assert.equal(created.image.componentId, id);
    const originalIndex = components.findIndex(item => item.id === original.id);
    updateComponentRecord(original.id, { price: original.price + 1 });
    assert.equal(components[originalIndex].image.status, 'verified');
    updateComponentRecord(original.id, { specs: { ...original.specs, capacityGb: 9999 } });
    assert.equal(components[originalIndex].image.status, 'blocked');
    assert.match(components[originalIndex].image.blocker, /variante alterado/);
  } finally {
    const idx = components.findIndex(item => item.id === original.id);
    components[idx] = original;
    components.splice(components.findIndex(item => item.id === id), 1);
  }
});

test('catalog source identity changes cannot reuse an old verified registry photo', () => {
  const original = components.find(item => item.image.status === 'verified');
  assert.equal(attachComponentImage({ ...original, name: original.name + ' other variant' }).image.status, 'blocked');
});
