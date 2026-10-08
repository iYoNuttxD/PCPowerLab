import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { components } from '../../../src/data/components.mock.js';
import { readyBuilds } from '../../../src/data/readyBuilds.js';
import { validateCatalogResponse } from '../../src/utils/catalogResponse.js';

const photo = components.find(component => component.id === 'ssd-samsung-980-pro-1tb');
const otherPhoto = components.find(component => component.id === 'ssd-samsung-970-evo-plus-250gb');
const types = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
const ids = { ...readyBuilds[0].components, storageId: photo.id, fans: [] };
const selected = Object.fromEntries(types.map(type => [type, components.find(component => component.id === ids[`${type}Id`])]));
const saved = { id: 'photo-build', name: 'Build com fotografia verificada', components: ids, totalEstimatedPrice: 5000 };
const ok = (route, data) => route.fulfill({ json: { success: true, data } });
const cropCpus = JSON.parse(readFileSync(new URL('../../../tests/fixtures/component-image-crops.json', import.meta.url), 'utf8'));

async function setup(page, catalog = components) {
  // Invalid photo metadata is allowed here; malformed catalog identities are not.
  validateCatalogResponse(catalog);
  await page.addInitScript(selection => localStorage.setItem('pcpowerlab-build-state', JSON.stringify({ selectedComponents: selection, wizardStep: 'review', budget: { amount: 6000, currency: 'BRL' }, recommendation: { components: selection, totalEstimatedPrice: 5000 } })), selected);
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/components') return ok(route, catalog);
    if (path === '/saved-builds') return ok(route, [saved]);
    if (path === '/ready-builds') return ok(route, [{ ...readyBuilds[0], components: ids }]);
    if (path.startsWith('/share/build/')) return ok(route, { buildSummary: { name: saved.name, components: ids } });
    if (path === '/upgrades/suggest') return ok(route, { suggestions: [{ componentType: 'storage', currentComponent: { id: otherPhoto.id, name: otherPhoto.name }, suggestedComponent: { id: photo.id, name: photo.name }, reason: 'Teste da apresentação de peças', estimatedUpgradeCost: 100 }] });
    if (path === '/build-comparison') return ok(route, { builds: [{ name: 'Build atual', components: selected, totalEstimatedPrice: 5000 }, saved], recommendedBuild: { name: 'Build atual' } });
    if (path === '/components/cost-benefit') return ok(route, [{ component: { id: photo.id, name: photo.name }, costBenefitScore: 80 }]);
    return ok(route, []);
  });
}

async function verifyPhoto(page, locator = page.locator(`.component-media[data-component-id="${photo.id}"]`).first()) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator.locator('img')).toHaveAttribute('src', photo.image.imagePath);
  await expect(locator.locator('img')).toBeVisible();
  await expect(locator).toHaveAttribute('data-image-state', 'verified');
  await expect(locator.locator('img')).toHaveCSS('object-fit', 'contain');
  await expect(locator.locator('details')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Créditos das imagens', exact: true })).toHaveAttribute('href', '/image-credits');
}

test('shows exact local images in summary, wizard, recommendations and ID-only saved/shared contexts', async ({ page }) => {
  await setup(page);
  for (const path of ['/summary', '/build', '/saved-builds', '/shared/photo-build']) {
    await page.goto(path);
    await verifyPhoto(page);
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.evaluate(() => document.body.clientWidth));
  }
  await page.goto('/build');
  await verifyPhoto(page, page.locator('.recommendation-card').locator(`.component-media[data-component-id="${photo.id}"]`));
});

test('ready build details and build comparison selections render ID-resolved media', async ({ page }) => {
  await setup(page);
  await page.goto('/ready-builds');
  await verifyPhoto(page);
  await page.getByRole('button', { name: 'Ver detalhes', exact: true }).first().click();
  await verifyPhoto(page, page.getByRole('dialog').locator(`.component-media[data-component-id="${photo.id}"]`));
  await page.keyboard.press('Escape');
  await page.goto('/compare');
  await page.getByText('Ver componentes', { exact: true }).first().click();
  await verifyPhoto(page);
  await page.getByRole('button', { name: 'Selecionar', exact: true }).click();
  await page.getByRole('button', { name: 'Comparar selecionadas', exact: true }).click();
  const comparison = page.getByRole('region', { name: /Comparação de builds/ });
  await comparison.getByText('Ver componentes', { exact: true }).first().click();
  await verifyPhoto(page, comparison.locator(`.component-media[data-component-id="${photo.id}"]`).first());
});

test('individual recommendations, upgrades and ranking use current catalog metadata', async ({ page }) => {
  await setup(page);
  await page.goto('/upgrades');
  await page.getByRole('button', { name: 'Gerar sugestões', exact: true }).click();
  await verifyPhoto(page, page.locator('.upgrade-card').locator(`.component-media[data-component-id="${photo.id}"]`));
  await page.goto('/insights');
  await verifyPhoto(page);
});

test('a stale verified snapshot cannot override current blocked metadata or load legacy URLs', async ({ page }) => {
  await setup(page, components.map(component => component.id === photo.id ? { ...component, image: { ...component.image, status: 'blocked' } } : component));
  await page.goto('/summary');
  const media = page.locator(`.component-media[data-component-id="${photo.id}"]`).first();
  await expect(media.locator('img')).toHaveCount(0);
  await expect(media.getByRole('img', { name: `Fotografia não disponível: ${photo.name}`, exact: true })).toBeVisible();
});

test('mismatched IDs, external paths and unverified statuses fail closed', async ({ page }) => {
  const invalid = [
    { ...photo, id: 'wrong-model' },
    { ...photo, id: 'external-path', image: { ...photo.image, componentId: 'external-path', imagePath: 'https://example.com/image.jpg' } },
    { ...photo, id: 'unverified', image: { ...photo.image, componentId: 'unverified', status: 'pending' } }
  ];
  await setup(page, invalid);
  await page.goto('/components');
  await expect(page.locator('.component-card')).toHaveCount(3);
  await expect(page.locator('.component-card img')).toHaveCount(0);
  await expect(page.locator('.component-card .component-image-fallback')).toHaveCount(3);
});

test('a name-only saved snapshot cannot infer an approved catalog photo by name', async ({ page }) => {
  await setup(page);
  await page.route('**/api/v1/saved-builds', route => ok(route, [{
    ...saved,
    components: { storage: { name: photo.name, category: 'storage', image: photo.image } }
  }]));
  await page.goto('/saved-builds');
  const media = page.locator('.component-media').filter({
    has: page.getByRole('img', { name: `Fotografia não disponível: ${photo.name}`, exact: true })
  });
  await expect(media).toHaveCount(1);
  await expect(media.locator('img')).toHaveCount(0);
  await expect(media).toHaveAttribute('data-image-state', 'unavailable');
});

test('loading, error and subsequent verified source have accessible states and no broken image', async ({ page }) => {
  await setup(page, [photo]);
  let release;
  await page.route(`**${photo.image.imagePath}`, async route => {
    await new Promise(resolve => { release = resolve; });
    await route.abort();
  });
  await page.goto('/components');
  const media = page.locator('.component-card .component-media');
  await expect(media).toHaveAttribute('data-image-state', 'loading');
  await expect(media.getByRole('status')).toContainText('Carregando fotografia');
  await expect.poll(() => Boolean(release)).toBe(true);
  release();
  await expect(media).toHaveAttribute('data-image-state', 'unavailable');
  await expect(media.locator('img')).toHaveCount(0);
  await page.unroute(`**${photo.image.imagePath}`);
  await page.reload();
  await verifyPhoto(page);
});

test('changing a failed model to a different exact model resets image state', async ({ page }) => {
  await setup(page, [photo, otherPhoto]);
  await page.route(`**${photo.image.imagePath}`, route => route.abort());
  await page.goto('/components');
  await page.getByRole('button', { name: `Detalhes de ${photo.name}`, exact: true }).click();
  await expect(page.getByRole('dialog').locator('.component-media')).toHaveAttribute('data-image-state', 'unavailable');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: `Detalhes de ${otherPhoto.name}`, exact: true }).click();
  await expect(page.getByRole('dialog').locator('.component-media')).toHaveAttribute('data-image-state', 'verified');
  await expect(page.getByRole('dialog').locator('img')).toHaveAttribute('src', otherPhoto.image.imagePath);
});

test('exact Ryzen CPUs display distinct reviewed windows of the intact licensed original', async ({ page }) => {
  const cpus = cropCpus;
  await setup(page, cpus);
  await page.route(`**${cpus[0].image.imagePath}`, route => route.fulfill({ body: readFileSync(new URL('../../../tests/fixtures/component-images/amd-ryzen-5500-5600-original.png', import.meta.url)), contentType: 'image/png' }));
  await page.goto('/components');
  for (const cpu of cpus) {
    const media = page.locator(`.component-card .component-media[data-component-id="${cpu.id}"]`);
    await expect(media).toHaveAttribute('data-image-state', 'verified');
    const image = media.getByRole('img', { name: cpu.image.alt, exact: true });
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute('data-image-crop', 'reviewed');
    await expect(image.locator('image')).toHaveAttribute('href', cpu.image.imagePath);
    await expect(image.locator('polygon')).toHaveAttribute('points', cpu.image.crop.points.map(point => point.join(',')).join(' '));
    await expect(media.locator('details')).toHaveCount(0);
  }
  const clipIds = await page.locator('.component-card clipPath').evaluateAll(elements => elements.map(element => element.id));
  expect(new Set(clipIds).size).toBe(2);
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.evaluate(() => document.body.clientWidth));
});

test('an unavailable composite original falls back accessibly for both exact CPU models', async ({ page }) => {
  const cpus = cropCpus;
  await setup(page, cpus);
  await page.route(`**${cpus[0].image.imagePath}`, route => route.abort());
  await page.goto('/components');
  for (const cpu of cpus) {
    const media = page.locator(`.component-card .component-media[data-component-id="${cpu.id}"]`);
    await expect(media).toHaveAttribute('data-image-state', 'unavailable');
    await expect(media.locator('image')).toHaveCount(0);
    await expect(media.getByRole('img', { name: `Fotografia não disponível: ${cpu.name}`, exact: true })).toBeVisible();
  }
});


test('one credits destination preserves photo author, source, license and modifications', async ({ page }) => {
  await setup(page, [photo, ...cropCpus]);
  await page.goto('/image-credits');
  for (const component of [photo, ...cropCpus]) {
    const credit = page.locator(`.image-credit[id="${component.id}"]`);
    await expect(credit.getByRole('heading', { name: component.name, exact: true })).toBeVisible();
    await expect(credit.getByRole('link', { name: `Foto: ${component.image.author}`, exact: true })).toHaveAttribute('href', component.image.imageSource);
    await expect(credit.getByRole('link', { name: component.image.license, exact: true })).toHaveAttribute('href', component.image.licenseUrl);
    await expect(credit).toContainText(component.image.modifications);
  }
});
