import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifiedComponentImage, isSecureImageLink } from '../src/utils/componentImage.js';
import { components } from '../../src/data/components.mock.js';

const photo = components.find(component => component.id === 'ssd-samsung-980-pro-1tb');

test('only exact verified photographic metadata reaches a local raster image', () => {
  assert.equal(verifiedComponentImage(photo), photo.image);
  for (const imageType of ['illustration', 'render', 'icon', null, undefined]) {
    assert.equal(verifiedComponentImage({ ...photo, image: { ...photo.image, imageType } }), null);
  }
  for (const status of ['blocked', 'pending', 'VERIFIED', null, undefined]) {
    assert.equal(verifiedComponentImage({ ...photo, image: { ...photo.image, status } }), null);
  }
  assert.equal(verifiedComponentImage({ ...photo, id: 'different-capacity' }), null);
  assert.equal(verifiedComponentImage({ name: photo.name, image: photo.image }), null);
  assert.equal(verifiedComponentImage(null), null);
});

test('external URLs, SVG, traversal, query strings and encoded paths fail closed', () => {
  for (const imagePath of [
    'https://example.com/product.jpg', '//example.com/product.jpg', 'data:image/png;base64,abc',
    '/images/components/../wrong.jpg', '/images/components/%2e%2e/wrong.jpg', '/images/components/a.svg',
    '/images/components/a.jpg?model=b', '/images/components/a.jpg#b', '/images/components/a b.jpg',
    '/images/components/.hidden.jpg', '/images/components/nested/a.jpg', '/elsewhere/a.jpg', null
  ]) assert.equal(verifiedComponentImage({ ...photo, image: { ...photo.image, imagePath } }), null, String(imagePath));
  for (const imagePath of ['/images/components/exact-model.webp', '/images/components/exact_model-2.jpg', '/images/components/exact-model.png']) {
    assert.equal(verifiedComponentImage({ ...photo, image: { ...photo.image, imagePath } })?.imagePath, imagePath);
  }
});

test('missing provenance, rights, verification or partial licensed attribution is rejected', () => {
  for (const field of ['componentId', 'imageSource', 'manufacturerProductUrl', 'rightsBasis', 'lastVerifiedAt', 'author', 'license', 'licenseUrl']) {
    assert.equal(verifiedComponentImage({ ...photo, image: { ...photo.image, [field]: null } }), null, field);
  }
  for (const field of ['imageSource', 'manufacturerProductUrl', 'licenseUrl']) {
    assert.equal(verifiedComponentImage({ ...photo, image: { ...photo.image, [field]: 'javascript:alert(1)' } }), null);
  }
  for (const lastVerifiedAt of ['not-a-date', '', 2026, '2026-02-30', '2099-01-01', '2025-13-01']) {
    assert.equal(verifiedComponentImage({ ...photo, image: { ...photo.image, lastVerifiedAt } }), null);
  }
  assert.equal(verifiedComponentImage({ ...photo, image: { ...photo.image, author: 5 } }), null);
  assert.equal(verifiedComponentImage({ ...photo, image: { ...photo.image, author: null, license: null, licenseUrl: null } }), null);
  assert.equal(isSecureImageLink('https://name:secret@example.com/image'), false);
  assert.equal(isSecureImageLink('https://example.com/a b'), false);
  assert.equal(isSecureImageLink('http://example.com/a'), false);
});

test('legacy image.url and sourceUrl fields never authorize a photograph', () => {
  assert.equal(verifiedComponentImage({ ...photo, image: { url: '/images/components/legacy.jpg', sourceUrl: photo.image.imageSource, author: photo.image.author, license: photo.image.license, licenseUrl: photo.image.licenseUrl } }), null);
});
