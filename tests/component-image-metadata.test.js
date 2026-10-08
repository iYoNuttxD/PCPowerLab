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

test('both Ryzen image contracts retain exact catalog identity and distinct approved display windows', () => {
  const ids = ['cpu-ryzen-5-5500', 'cpu-ryzen-5-5600'];
  const products = ids.map(id => components.find(component => component.id === id));
  for (const product of products) {
    assert.equal(product.image.componentId, product.id);
    assert.equal(product.image.status, 'verified');
    assert.match(product.image.manufacturerProductUrl, new RegExp(`${product.id.replace('cpu-', 'amd-')}.html$`));
    assert.equal(product.image.author, 'Мой Компьютер');
    assert.equal(product.image.license, 'CC BY 3.0');
    assert.equal(product.image.crop.sourceWidth, 2560);
    assert.equal(product.image.crop.sourceHeight, 1440);
    assert.deepEqual(attachComponentImage({ ...product, image: { crop: 'caller-controlled' } }).image.crop, product.image.crop);
    assert.equal(attachComponentImage({ ...product, partNumber: 'unreviewed-variant' }).image.status, 'blocked');
    assert.equal(attachComponentImage({ ...product, specs: { ...product.specs, socket: 'AM5' } }).image.status, 'blocked');
  }
  assert.equal(products[0].image.imagePath, products[1].image.imagePath);
  assert.equal(products[0].image.sha256, products[1].image.sha256);
  assert.notDeepEqual(products[0].image.crop, products[1].image.crop);
});
