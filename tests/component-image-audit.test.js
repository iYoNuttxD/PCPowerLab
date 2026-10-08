import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { auditComponentImages, readCatalogSnapshot, renderImageAuditMarkdown } from '../scripts/audit-component-images.js';
import { addComponentRecord, listComponentRecords } from '../src/data/component.repository.js';
import { components as repositoryComponents } from '../src/data/components.mock.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const now = '2026-10-08T12:00:00.000Z';
function setup(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'component-image-audit-'));
  const mediaRoot = path.join(directory, 'media');
  fs.mkdirSync(mediaRoot);
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const makeImage = (name = 'component-a.png', { format = 'PNG', color = 'red', width = 96, height = 96 } = {}) => {
    const filename = path.join(mediaRoot, name);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    const creation = spawnSync(process.env.PYTHON || 'python3', ['-c', 'from PIL import Image; import sys; Image.new("RGB", (int(sys.argv[2]), int(sys.argv[3])), sys.argv[4]).save(sys.argv[1], format=sys.argv[5])', filename, String(width), String(height), color, format], { encoding: 'utf8' });
    assert.equal(creation.status, 0, creation.stderr || creation.error?.message);
    return filename;
  };
  const run = (records, options = {}) => auditComponentImages({ components: records, mediaRoot, now, ...options });
  return { directory, mediaRoot, makeImage, run };
}
function component(id = 'component-a', image = {}, fields = {}) {
  return {
    id, name: `Exact ${id}`, category: 'gpu', brand: 'Test Brand', partNumber: `${id}-SKU`, specs: { vramGb: 12, edition: 'OC', lengthMm: 272 },
    image: { componentId: id, imagePath: `/images/components/${id}.png`, imageSource: 'https://example.com/exact-image', manufacturerProductUrl: 'https://manufacturer.example.com/exact-product', rightsBasis: 'Photographer permits use under the recorded license.', imageType: 'photo', lastVerifiedAt: '2026-10-07', status: 'verified', blocker: null, author: 'Test Photographer', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', ...image },
    ...fields
  };
}
const codes = (report, id = 'component-a') => report.components.find((row) => row.id === id).issues.map((issue) => issue.code);

test('complete audit fully decodes bytes and preserves exact dynamic inventory and evidence', (t) => {
  const { makeImage, run } = setup(t);
  makeImage();
  const record = component();
  const report = run([record]);
  assert.equal(report.passed, true);
  assert.equal(report.summary.active, 1);
  assert.equal(report.summary.coveragePercent, 100);
  assert.equal(report.components[0].file.decoded, true);
  assert.equal(report.components[0].file.format, 'PNG');
  assert.equal(report.components[0].file.width, 96);
  assert.match(report.components[0].file.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(report.components[0].specs, record.specs);
  assert.equal(report.components[0].partNumber, record.partNumber);
  assert.equal(report.components[0].status, 'verified');
  assert.match(report.verificationScope, /não uma prova/);
  const markdown = renderImageAuditMarkdown(report);
  assert.match(markdown, /component-a-SKU/);
  assert.match(markdown, /vramGb/);
  assert.match(markdown, /manufacturer\.example/);
});

test('a newly added active ID without an image blocks coverage without changing any allowlist', (t) => {
  const { makeImage, run } = setup(t);
  makeImage();
  const report = run([component(), component('admin-created-new-sku', {}, { image: null })]);
  assert.equal(report.passed, false);
  assert.equal(report.result, 'partial');
  assert.equal(report.summary.active, 2);
  assert.equal(report.summary.verified, 1);
  assert.equal(report.summary.blocked, 1);
  assert.equal(report.summary.coveragePercent, 50);
  assert.equal(report.components[1].status, 'blocked');
  assert.equal(report.components[1].fallback, true);
  assert.match(report.components[1].blocker, /fallback/);
  assert.ok(codes(report, 'admin-created-new-sku').includes('missing_image_metadata'));
});

test('default catalog provider reads repository additions at audit time', () => {
  const id = 'audit-test-runtime-admin-created';
  const before = listComponentRecords().length;
  addComponentRecord(component(id, {}, { image: null }));
  try {
    const report = auditComponentImages({ now });
    assert.equal(report.summary.active, before + 1);
    assert.equal(report.components.find((row) => row.id === id).status, 'blocked');
  } finally {
    const index = repositoryComponents.findIndex((row) => row.id === id);
    if (index >= 0) repositoryComponents.splice(index, 1);
  }
});

test('inactive records are excluded from coverage and their retained assets are not orphans', (t) => {
  const { makeImage, run } = setup(t);
  makeImage();
  makeImage('inactive.png', { color: 'blue' });
  const report = run([component(), component('inactive', {}, { active: false })]);
  assert.equal(report.passed, true);
  assert.equal(report.summary.active, 1);
  assert.equal(report.summary.inactiveExcluded, 1);
  assert.equal(report.orphanFiles.length, 0);
});

test('SHA-256 reuse across different IDs blocks both exact-model assertions', (t) => {
  const { makeImage, mediaRoot, run } = setup(t);
  const original = makeImage();
  fs.copyFileSync(original, path.join(mediaRoot, 'component-b.png'));
  const report = run([component(), component('component-b')]);
  assert.equal(report.summary.verified, 0);
  assert.equal(report.duplicateFiles.length, 1);
  assert.deepEqual(report.duplicateFiles[0].componentIds, ['component-a', 'component-b']);
  assert.ok(codes(report).includes('suspect_duplicate_image'));
  assert.ok(codes(report, 'component-b').includes('suspect_duplicate_image'));
});

test('same local file reused across distinct IDs is also a suspect duplicate', (t) => {
  const { makeImage, run } = setup(t);
  makeImage();
  const report = run([component(), component('component-b', { imagePath: '/images/components/component-a.png' })]);
  assert.equal(report.duplicateFiles.length, 1);
  assert.equal(report.summary.blocked, 2);
});

test('duplicate catalog IDs fail even if their photos differ', (t) => {
  const { makeImage, run } = setup(t);
  makeImage();
  makeImage('another.png', { color: 'blue' });
  const report = run([component(), component('component-a', { imagePath: '/images/components/another.png' })]);
  assert.equal(report.passed, false);
  assert.ok(report.components.every((row) => row.issues.some((issue) => issue.code === 'duplicate_component_id')));
});

test('exact image componentId is mandatory and cannot borrow another model metadata', (t) => {
  const { makeImage, run } = setup(t);
  makeImage();
  const report = run([component('component-a', { componentId: 'different-capacity-sku' })]);
  assert.ok(codes(report).includes('component_id_mismatch'));
  assert.equal(report.summary.verified, 0);
});

for (const imagePath of ['https://example.com/photo.png', 'data:image/png;base64,AAAA', '//example.com/photo.png', '/images/components/../../secret.png', '/images/components/%2e%2e/secret.png', '/images/components/a\\secret.png', '/images/components/photo.png?remote=1', '/images/components/photo.png#fragment', '/images/components//secret.png']) {
  test(`unsafe or remote image path is rejected: ${imagePath}`, (t) => {
    const { run } = setup(t);
    const report = run([component('component-a', { imagePath })]);
    assert.ok(codes(report).includes('unsafe_image_path'));
    assert.equal(report.summary.verified, 0);
  });
}

test('symlink escapes cannot cause audit to trust files outside the media root', (t) => {
  const { directory, mediaRoot, makeImage, run } = setup(t);
  const source = makeImage('inside.png');
  const outside = path.join(directory, 'outside.png');
  fs.renameSync(source, outside);
  fs.symlinkSync(outside, path.join(mediaRoot, 'component-a.png'));
  const report = run([component()]);
  assert.ok(codes(report).includes('path_escape'));
  assert.equal(report.components[0].file, null);
});

test('symlink directory escapes are rejected before any image read', (t) => {
  const { directory, mediaRoot, makeImage, run } = setup(t);
  const source = makeImage('inside.png');
  const outside = path.join(directory, 'outside');
  fs.mkdirSync(outside);
  fs.renameSync(source, path.join(outside, 'component-a.png'));
  fs.symlinkSync(outside, path.join(mediaRoot, 'linked'));
  const report = run([component('component-a', { imagePath: '/images/components/linked/component-a.png' })]);
  assert.ok(codes(report).includes('path_escape'));
});

test('missing file and corrupt raster bytes are explicitly blocked', (t) => {
  const { mediaRoot, run } = setup(t);
  assert.ok(codes(run([component()])).includes('missing_file'));
  fs.writeFileSync(path.join(mediaRoot, 'component-a.png'), 'not a photograph');
  const corrupt = run([component()]);
  assert.ok(codes(corrupt).includes('invalid_image_bytes'));
  assert.equal(corrupt.components[0].file.decoded, false);
});

test('truncated image headers are not accepted as integrity verification', (t) => {
  const { makeImage, run } = setup(t);
  const filename = makeImage('component-a.jpg', { format: 'JPEG' });
  const bytes = fs.readFileSync(filename);
  fs.writeFileSync(filename, bytes.subarray(0, bytes.length - 20));
  const report = run([component('component-a', { imagePath: '/images/components/component-a.jpg' })]);
  assert.ok(codes(report).includes('invalid_image_bytes'));
});

test('extension must agree with decoded bytes and unsupported formats do not count', (t) => {
  const { makeImage, run } = setup(t);
  makeImage('fake.jpg', { format: 'PNG' });
  const fake = run([component('component-a', { imagePath: '/images/components/fake.jpg' })]);
  assert.ok(codes(fake).includes('format_mismatch'));
  makeImage('component-a.gif', { format: 'GIF', color: 'blue' });
  const gif = run([component('component-a', { imagePath: '/images/components/component-a.gif' })]);
  assert.ok(codes(gif).includes('unsupported_format'));
});

test('WebP JPEG and AVIF are decoded when supported by Pillow', (t) => {
  const { makeImage, run } = setup(t);
  const records = [];
  for (const [format, extension, color] of [['WEBP', 'webp', 'red'], ['JPEG', 'jpg', 'blue'], ['AVIF', 'avif', 'green']]) {
    const id = format.toLowerCase();
    makeImage(`${id}.${extension}`, { format, color });
    records.push(component(id, { imagePath: `/images/components/${id}.${extension}` }));
  }
  const report = run(records);
  assert.equal(report.passed, true);
  assert.equal(report.summary.verified, 3);
});

test('empty files, excessive byte size, dimensions and tiny placeholders fail', (t) => {
  const { makeImage, mediaRoot, run } = setup(t);
  fs.writeFileSync(path.join(mediaRoot, 'component-a.png'), '');
  assert.ok(codes(run([component()])).includes('empty_file'));
  makeImage();
  assert.ok(codes(run([component()], { limits: { maxBytes: 10 } })).includes('file_too_large'));
  assert.ok(codes(run([component()], { limits: { maxDimension: 80 } })).includes('invalid_image_bytes'));
  assert.ok(codes(run([component()], { limits: { maxPixels: 100 } })).includes('invalid_image_bytes'));
  makeImage('component-a.png', { width: 1, height: 1 });
  assert.ok(codes(run([component()])).includes('image_too_small'));
});

test('missing provenance and licensing metadata is listed per component', (t) => {
  const { makeImage, run } = setup(t);
  makeImage();
  const report = run([component('component-a', { rightsBasis: null, imageSource: null, manufacturerProductUrl: '', author: '', license: '', licenseUrl: null, lastVerifiedAt: null })]);
  assert.ok(codes(report).includes('missing_metadata'));
  for (const field of ['rightsBasis', 'imageSource', 'manufacturerProductUrl', 'author', 'license', 'licenseUrl', 'lastVerifiedAt']) assert.ok(report.components[0].missingMetadata.includes(field));
  assert.equal(report.summary.verified, 0);
});

for (const field of ['imageSource', 'manufacturerProductUrl', 'licenseUrl']) {
  test(`${field} must be safe HTTPS provenance`, (t) => {
    const { makeImage, run } = setup(t);
    makeImage();
    for (const value of ['http://example.com/insecure', 'https:example.com/implicit-slashes', 'javascript:alert(1)', 'https://user:secret@example.com/private', 'https://exa\tmple.com/normalized', 'not a URL']) {
      const report = run([component('component-a', { [field]: value })]);
      assert.ok(codes(report).includes('unsafe_metadata_url'));
    }
  });
}

test('verification date must be real ISO date and not in the future', (t) => {
  const { makeImage, run } = setup(t);
  makeImage();
  for (const value of ['tomorrow', '2026-02-30', '2027-01-01', '2026-10-09T00:00:00Z', '10/07/2026', '2026-13-01', '2026-10-07T24:00:00Z']) {
    const report = run([component('component-a', { lastVerifiedAt: value })]);
    assert.ok(codes(report).includes('invalid_verification_date'), value);
  }
  assert.equal(run([component('component-a', { lastVerifiedAt: '2026-10-08T09:00:00-03:00' })]).passed, true);
});

test('blocked records require a reason and icons never count as product photos', (t) => {
  const { makeImage, run } = setup(t);
  makeImage();
  const icon = run([component('component-a', { imageType: 'icon' })]);
  assert.ok(codes(icon).includes('not_product_photo'));
  const blocked = run([component('component-a', { status: 'blocked', blocker: 'Exact model rights remain unverified.' })]);
  assert.equal(blocked.components[0].status, 'blocked');
  assert.equal(blocked.components[0].fallback, true);
  assert.match(blocked.components[0].blocker, /Exact model rights/);
  assert.ok(codes(run([component('component-a', { status: 'blocked' })])).includes('missing_blocker'));
  assert.ok(codes(run([component('component-a', { blocker: 'Still blocked' })])).includes('conflicting_blocker'));
});

test('orphan media fails strict audit while attribution documents are ignored', (t) => {
  const { mediaRoot, makeImage, run } = setup(t);
  makeImage();
  fs.writeFileSync(path.join(mediaRoot, 'ATTRIBUTION.md'), 'Credits');
  fs.writeFileSync(path.join(mediaRoot, '.gitkeep'), '');
  assert.equal(run([component()]).passed, true);
  makeImage('unreferenced/old-variant.png', { color: 'green' });
  const report = run([component()]);
  assert.equal(report.passed, false);
  assert.equal(report.summary.verified, 1);
  assert.deepEqual(report.orphanFiles, ['/images/components/unreferenced/old-variant.png']);
  assert.ok(report.issues.some((issue) => issue.code === 'orphan_file'));
});

test('decoder absence fails closed rather than passing header-only checks', (t) => {
  const { makeImage, run } = setup(t);
  makeImage();
  assert.throws(() => run([component()], { pythonExecutable: '/nonexistent/no-python' }), /verification cannot be skipped/);
});

test('empty or malformed catalogs cannot produce a passing claim', (t) => {
  const { run } = setup(t);
  const report = run([]);
  assert.equal(report.passed, false);
  assert.equal(report.summary.coveragePercent, 0);
  assert.ok(report.issues.some((issue) => issue.code === 'empty_catalog'));
  assert.throws(() => run([null]), /component objects/);
  assert.throws(() => run([component()], { now: 'invalid-date' }), /valid date/);
});

test('CLI reads runtime API snapshots, includes admin additions, writes both reports and exits 1 on partial coverage', (t) => {
  const { directory, mediaRoot, makeImage } = setup(t);
  makeImage();
  const snapshot = path.join(directory, 'runtime.json');
  const added = component('fresh-admin-component', {}, { image: null });
  fs.writeFileSync(snapshot, JSON.stringify({ success: true, data: [component(), added] }));
  const output = path.join(directory, 'report', 'coverage');
  const result = spawnSync(process.execPath, ['scripts/audit-component-images.js', '--catalog', snapshot, '--media-root', mediaRoot, '--report', output], { cwd: projectRoot, encoding: 'utf8' });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /PARTIAL/);
  const report = JSON.parse(fs.readFileSync(`${output}.json`, 'utf8'));
  assert.equal(report.summary.active, 2);
  assert.ok(report.components.some((row) => row.id === added.id && row.status === 'blocked'));
  assert.match(fs.readFileSync(`${output}.md`, 'utf8'), /fresh-admin-component/);
});

test('CLI returns 0 only for complete snapshot and 2 for invalid input', (t) => {
  const { directory, mediaRoot, makeImage } = setup(t);
  makeImage();
  const snapshot = path.join(directory, 'catalog.json');
  fs.writeFileSync(snapshot, JSON.stringify([component()]));
  const args = ['scripts/audit-component-images.js', '--catalog', snapshot, '--media-root', mediaRoot, '--json', '--strict'];
  const result = spawnSync(process.execPath, args, { cwd: projectRoot, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).summary.verified, 1);
  fs.writeFileSync(snapshot, JSON.stringify({ success: false, data: [component()] }));
  const invalid = spawnSync(process.execPath, args, { cwd: projectRoot, encoding: 'utf8' });
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /error response/);
});

test('snapshot reader accepts inventory export and rejects unsupported envelopes', (t) => {
  const { directory } = setup(t);
  const snapshot = path.join(directory, 'catalog.json');
  fs.writeFileSync(snapshot, JSON.stringify({ components: [component()] }));
  assert.equal(readCatalogSnapshot(snapshot)[0].id, 'component-a');
  fs.writeFileSync(snapshot, JSON.stringify({ data: { components: [] } }));
  assert.throws(() => readCatalogSnapshot(snapshot), /Snapshot must/);
});


test('reviewed SHA-256 matches the exact bytes fully decoded by Pillow', (t) => {
  const { makeImage, run } = setup(t);
  const filename = makeImage();
  const sha256 = createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
  const report = run([component('component-a', { sha256 })]);
  assert.equal(report.passed, true);
  assert.equal(report.components[0].file.decoded, true);
  assert.equal(report.components[0].file.sha256, sha256);
});

test('replacing a reviewed photo with a different valid raster blocks verified coverage', (t) => {
  const { makeImage, run } = setup(t);
  const filename = makeImage();
  const sha256 = createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
  makeImage('component-a.png', { color: 'blue' });
  const report = run([component('component-a', { sha256 })]);
  assert.equal(report.passed, false);
  assert.equal(report.components[0].file.decoded, true);
  assert.notEqual(report.components[0].file.sha256, sha256);
  assert.equal(report.components[0].status, 'blocked');
  assert.ok(codes(report).includes('reviewed_sha256_mismatch'));
});

test('supplied reviewed SHA-256 must be lowercase hexadecimal of exactly 64 characters', (t) => {
  const { makeImage, run } = setup(t);
  makeImage();
  for (const sha256 of [null, undefined, '', 'abc', 'a'.repeat(63), 'g'.repeat(64), 'A'.repeat(64), 123]) {
    const report = run([component('component-a', { sha256 })]);
    assert.equal(report.passed, false);
    assert.ok(codes(report).includes('invalid_reviewed_sha256'));
  }
  assert.equal(run([component()]).passed, true, 'The legacy schema without a hash remains valid');
});

test('untrusted snapshot category keys cannot modify the category accumulator prototype', (t) => {
  const { makeImage, run } = setup(t);
  makeImage();
  const report = run([component('component-a', {}, { category: '__proto__' })]);
  assert.equal(report.summary.categories.__proto__.active, 1);
  assert.equal(Object.prototype.active, undefined);
  assert.equal(Object.getPrototypeOf(report.summary.categories), null);
});

test('reviewed Ryzen windows share only the pinned intact original; ordinary duplicates remain blocked', () => {
  const report = auditComponentImages({ now });
  for (const id of ['cpu-ryzen-5-5500', 'cpu-ryzen-5-5600']) {
    const row = report.components.find(component => component.id === id);
    assert.equal(row.status, 'verified', JSON.stringify(row.issues));
    assert.equal(row.file.bytes, 2293406);
    assert.equal(row.file.width, 2560);
    assert.equal(row.file.height, 1440);
    assert.equal(row.file.sha256, '5bb56eec1d860765ba6aada606e9257d6eba6279844c074f6cc5a5dbd9c99b28');
  }
  assert.equal(report.reviewedSharedOriginals.length, 1);
  assert.equal(report.summary.suspectDuplicateGroups, 0);
  assert.equal(report.validationLimits.maxBytes, 2 * 1024 * 1024);
});

test('crop size exception cannot override an explicit stricter image limit', () => {
  const report = auditComponentImages({ now, limits: { maxBytes: 2 * 1024 * 1024 } });
  for (const id of ['cpu-ryzen-5-5500', 'cpu-ryzen-5-5600']) {
    assert.equal(report.components.find(row => row.id === id).status, 'blocked');
    assert.ok(codes(report, id).includes('file_too_large'));
  }
});

test('wrong model, overlapping or out-of-bounds crop and forged original digest never authorize source reuse', () => {
  const original = repositoryComponents.find(row => row.id === 'cpu-ryzen-5-5500');
  const other = repositoryComponents.find(row => row.id === 'cpu-ryzen-5-5600');
  for (const change of [
    { crop: null }, { crop: [] }, { crop: {} }, { crop: { ...original.image.crop, points: [[-1, 0], [100, 0], [100, 100], [0, 100]] } },
    { crop: { ...original.image.crop, points: [[0, 0], [2561, 0], [2561, 100], [0, 100]] } },
    { crop: other.image.crop }, { sha256: 'a'.repeat(64) }, { crop: { ...original.image.crop, sourceWidth: 2561 } }
  ]) {
    const edited = { ...original, image: { ...original.image, ...change } };
    const report = auditComponentImages({ components: [edited, other], now });
    assert.equal(report.components[0].status, 'blocked');
    assert.ok(codes(report, original.id).includes('unapproved_image_crop'));
    assert.equal(report.reviewedSharedOriginals.length, 0);
  }
  const moved = { ...original, id: 'cpu-another-model', image: { ...original.image, componentId: 'cpu-another-model' } };
  const report = auditComponentImages({ components: [moved, other], now });
  assert.ok(codes(report, moved.id).includes('unapproved_image_crop'));
  assert.equal(report.reviewedSharedOriginals.length, 0);
});

test('decoded dimensions and actual hash must match the reviewed composite metadata', (t) => {
  const { makeImage, run } = setup(t);
  makeImage('amd-ryzen-5500-5600-original.png', { width: 256, height: 144 });
  const original = repositoryComponents.find(row => row.id === 'cpu-ryzen-5-5500');
  const report = run([original]);
  assert.ok(codes(report, original.id).includes('reviewed_sha256_mismatch'));
  assert.ok(codes(report, original.id).includes('crop_source_dimensions_mismatch'));
  assert.equal(report.summary.verified, 0);
});
