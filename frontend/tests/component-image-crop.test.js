import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validImageCrop, approvedComponentImageCrop, imageCropViewBox, imageCropsOverlap, verifiedComponentImage } from '../src/utils/componentImage.js';
import { components } from '../../src/data/components.mock.js';

const cpus = ['cpu-ryzen-5-5500', 'cpu-ryzen-5-5600'].map(id => components.find(component => component.id === id));
const sample = { sourceWidth: 100, sourceHeight: 80, points: [[0, 0], [100, 0], [100, 80], [0, 80]] };

test('crop geometry accepts only four convex source-pixel corners within bounded dimensions', () => {
  assert.equal(validImageCrop(sample), true);
  assert.deepEqual(imageCropViewBox(sample), [0, 0, 100, 80]);
  const invalid = [null, [], {}, { ...sample, sourceWidth: 0 }, { ...sample, sourceWidth: '100' },
    { ...sample, sourceHeight: 4097 }, { ...sample, points: [[-1, 0], [100, 0], [100, 80], [0, 80]] },
    { ...sample, points: [[0, 0], [101, 0], [100, 80], [0, 80]] },
    { ...sample, points: [[0, 0], [100, 0], [100, 81], [0, 80]] },
    { ...sample, points: [[0, 0], [100, 0], [100, 80], [0.5, 80]] },
    { ...sample, points: [[0, 0], ['100', 0], [100, 80], [0, 80]] },
    { ...sample, points: [[0, 0], [NaN, 0], [100, 80], [0, 80]] },
    { ...sample, points: [[0, 0], [Infinity, 0], [100, 80], [0, 80]] },
    { ...sample, points: [[0, 0], [100, 80], [100, 0], [0, 80]] },
    { ...sample, points: [[0, 0], [100, 0], [20, 10], [0, 80]] },
    { ...sample, points: [[0, 0], [100, 0], [100, 0], [0, 80]] },
    { ...sample, points: [[0, 0], [100, 0], [100, 80]] },
    { ...sample, points: [[0, 0, 'url(x)'], [100, 0], [100, 80], [0, 80]] }];
  for (const crop of invalid) {
    assert.equal(validImageCrop(crop), false, JSON.stringify(crop));
    assert.equal(imageCropViewBox(crop), null);
  }
});

test('only the exact reviewed original, catalog IDs and distinct windows authorize cropped photos', () => {
  for (const component of cpus) {
    assert.equal(component.image.status, 'verified');
    assert.equal(verifiedComponentImage(component), component.image);
    assert.equal(approvedComponentImageCrop(component.image, component.id), component.image.crop);
    for (const change of [{ sha256: 'a'.repeat(64) }, { crop: null }, { crop: {} }, { crop: undefined },
      { crop: { ...component.image.crop, sourceWidth: 2559 } },
      { crop: { ...component.image.crop, points: component.image.crop.points.map(([x, y]) => [x + 1, y]) } }]) {
      assert.equal(verifiedComponentImage({ ...component, image: { ...component.image, ...change } }), null);
    }
    const other = cpus.find(cpu => cpu.id !== component.id);
    assert.equal(verifiedComponentImage({ ...component, image: { ...component.image, crop: other.image.crop } }), null);
    assert.equal(approvedComponentImageCrop(component.image, 'different-model'), null);
  }
  assert.equal(cpus[0].image.imagePath, cpus[1].image.imagePath);
  assert.equal(cpus[0].image.sha256, cpus[1].image.sha256);
  assert.equal(imageCropsOverlap(cpus[0].image.crop, cpus[1].image.crop), false);
});

test('convex-window overlap detects duplicate and intersecting crops even with rotated edges', () => {
  assert.equal(imageCropsOverlap(sample, sample), true);
  const left = { ...sample, points: [[0, 0], [40, 0], [40, 80], [0, 80]] };
  const right = { ...sample, points: [[41, 0], [100, 0], [100, 80], [41, 80]] };
  assert.equal(imageCropsOverlap(left, right), false);
  assert.equal(imageCropsOverlap(left, { ...right, points: [[39, 0], [100, 0], [100, 80], [39, 80]] }), true);
  assert.equal(imageCropsOverlap(left, null), true, 'Invalid geometry cannot authorize duplicate-source reuse');
});
