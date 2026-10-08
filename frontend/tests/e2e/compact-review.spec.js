import { test, expect } from '@playwright/test';
import { components } from '../../../src/data/components.mock.js';
import { readyBuilds } from '../../../src/data/readyBuilds.js';

const ids = readyBuilds[0].components;
const types = ['cpu', 'motherboard', 'gpu', 'ram', 'storage', 'psu', 'case'];
const selection = Object.fromEntries(types.map(type => [type, components.find(part => part.id === ids[`${type}Id`])]));
const saved = { id: 'compact-review', name: 'Computador para jogos e trabalho', description: 'Configuração salva', components: ids, totalEstimatedPrice: 6983.64 };
const ok = (route, data) => route.fulfill({ json: { success: true, data } });
async function setup(page) {
  await page.addInitScript(parts => localStorage.setItem('pcpowerlab-build-state', JSON.stringify({ selectedComponents: parts, budget: { amount: 10000, currency: 'BRL' } })), selection);
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/components') return ok(route, components);
    if (path === '/saved-builds') return ok(route, [saved]);
    if (path === '/build-comparison') return ok(route, { builds: [0, 1].map(index => ({ comparisonIndex: index, name: index ? saved.name : 'Montagem atual', components: selection, totalEstimatedPrice: 6983.64, compatible: true, performanceScore: 75, costBenefitScore: 70, comparisonScore: 74, budgetStatus: 'within_budget', alertSummary: { total: 0 }, bottleneckStatus: 'analyzed', bottleneckSummary: { total: 0 } })), recommendedBuild: { comparisonIndex: 0, name: 'Montagem atual', reason: 'Melhor pontuação entre as configurações comparadas.' } });
    return ok(route, []);
  });
}

for (const width of [320, 1440]) test(`comparison keeps money and header words intact at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await setup(page);
  await page.goto('/compare');
  expect(await page.locator('.comparison-selection').evaluate(element => Boolean(element.compareDocumentPosition(document.querySelector('.comparison-controls')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await page.getByRole('button', { name: 'Selecionar', exact: true }).click();
  await page.getByRole('button', { name: 'Comparar selecionadas', exact: true }).click();
  const region = page.getByRole('region', { name: /^Comparação de configurações/ });
  await expect(region).toBeVisible();
  const geometry = await region.evaluate(element => ({ view: element.clientWidth, content: element.scrollWidth, table: element.querySelector('table').getBoundingClientRect().width }));
  expect(geometry.table).toBeGreaterThanOrEqual(1280);
  expect(geometry.content).toBeGreaterThan(geometry.view);
  for (const heading of ['Compatível', 'Orçamento']) {
    const rects = await region.getByRole('columnheader', { name: heading, exact: true }).evaluate(element => {
      const range = document.createRange(); range.selectNodeContents(element); return [...range.getClientRects()].length;
    });
    expect(rects).toBe(1);
  }
  await expect(region.locator('.comparison-money').first()).toHaveCSS('white-space', 'nowrap');
  await region.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(() => region.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});

test('saved cards keep actions available and component gallery optional on tablet', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await setup(page); await page.goto('/saved-builds');
  const card = page.locator('.saved-build-card');
  const gallery = card.locator('.saved-build-components');
  await expect(gallery).not.toHaveAttribute('open');
  await expect(card.getByRole('button', { name: 'Abrir montagem', exact: true })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Trocar peça', exact: true })).toBeVisible();
  expect((await card.boundingBox()).height).toBeLessThan(950);
  await gallery.locator('summary').click();
  await expect(gallery).toHaveAttribute('open', '');
  await expect(gallery.locator('.component-identity')).toHaveCount(7);
  await gallery.locator('summary').click();
  const actions = card.locator('.saved-build-actions');
  await expect(actions).not.toHaveAttribute('open');
  await expect(actions.getByRole('button', { name: 'Nome e descrição', exact: true })).toBeHidden();
  await actions.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(actions).toHaveAttribute('open', '');
  await expect(actions.getByRole('button')).toHaveCount(8);
  await expect(actions.getByRole('link', { name: 'Upgrade', exact: true })).toHaveAttribute('href', '/upgrades?buildId=compact-review');
  await card.getByRole('button', { name: 'Nome e descrição', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Editar build salva' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card.getByRole('button', { name: 'Nome e descrição', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(actions).not.toHaveAttribute('open');
  await expect(actions.locator('summary')).toBeFocused();
});

test('saved deletion requires named confirmation and supports cancel, Escape and retry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  let deletes = 0, removed = false;
  await page.route('**/api/v1/saved-builds**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/saved-builds') return ok(route, removed ? [] : [saved]);
    if (path === `/saved-builds/${saved.id}` && route.request().method() === 'DELETE') {
      deletes += 1;
      if (deletes === 1) return route.fulfill({ status: 503, json: { success: false, message: 'Falha temporária ao excluir' } });
      removed = true;
      return ok(route, {});
    }
    return route.fallback();
  });
  await page.goto('/saved-builds');
  const card = page.locator('.saved-build-card');
  await card.locator('.saved-build-actions > summary').click();
  const remove = card.getByRole('button', { name: 'Excluir', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Excluir build salva', exact: true });
  await remove.click();
  await expect(dialog).toContainText(saved.name);
  await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused();
  expect(deletes).toBe(0);
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(dialog).toBeHidden(); await expect(remove).toBeFocused();
  expect(deletes).toBe(0);
  await remove.click(); await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden(); await expect(remove).toBeFocused();
  expect(deletes).toBe(0);
  await remove.click();
  await dialog.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
  await expect(dialog).toContainText('Falha temporária ao excluir');
  await expect(card).toHaveCount(1); expect(deletes).toBe(1);
  await dialog.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
  await expect(dialog).toBeHidden(); await expect(card).toHaveCount(0);
  expect(deletes).toBe(2);
});

test('retired items keep their identity in saved builds and alternatives require explicit selection', async ({ page }) => {
  const original = selection.storage;
  const replacement = { ...original, id: 'storage-replacement-fixture', name: 'Alternativa de armazenamento', image: null, price: 450, catalogStatus: 'active', selectable: true, active: true };
  const legacy = { ...original, active: false, catalogStatus: 'legacy', selectable: false, price: null, replacementId: replacement.id,
    replacement: { id: replacement.id, name: replacement.name, category: 'storage', requiresSelection: true } };
  const observedQueries = [];
  await setup(page);
  await page.route(/\/api\/v1\/components(?:\?.*)?$/, route => {
    observedQueries.push(new URL(route.request().url()).searchParams.get('includeLegacy'));
    return ok(route, [...components.filter(part => part.id !== original.id), legacy, replacement]);
  });
  await page.goto('/saved-builds');
  const gallery = page.locator('.saved-build-components');
  await gallery.locator('summary').click();
  const identity = gallery.locator('.component-identity').filter({ hasText: original.name });
  await expect(identity).toContainText('Item anterior');
  await expect(identity).not.toContainText(replacement.name);
  await identity.getByRole('link', { name: 'Ver alternativa', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`replacementFor=${original.id}`));
  await expect(page.locator('.component-card')).toHaveCount(1);
  await expect(page.locator('.component-card')).toContainText(replacement.name);
  await expect(page.locator('.component-card')).not.toContainText(original.name);
  expect(observedQueries.every(value => value === 'true')).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pcpowerlab-build-state')).selectedComponents.storage.id)).toBe(original.id);
  await page.getByRole('button', { name: `Selecionar: ${replacement.name}`, exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pcpowerlab-build-state')).selectedComponents.storage.id)).toBe(replacement.id);
});
