// Browser-only acceptance coverage. Collection is not execution evidence.
import { test, expect } from '@playwright/test';
import { listComponents } from '../../../src/services/component.service.js';
import { currentBuild } from './helpers/catalog.js';
import { color, contrast } from '../../scripts/lib/visualContrast.mjs';

const catalog = listComponents({ includeLegacy: true });
const selected = { ...currentBuild(catalog), fans: [] };
const key = 'pcpowerlab-build-state';
const ok = (route, data) => route.fulfill({ json: { success: true, data } });
async function seed(page) {
  await page.addInitScript(({ storageKey, state }) => localStorage.setItem(storageKey, JSON.stringify(state)), {
    storageKey: key, state: { wizardStep: 'cpu', selectedComponents: selected, budget: { amount: 5000, currency: 'BRL', priority: 'cost-benefit' }, usageType: 'work' }
  });
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/components')) return ok(route, catalog);
    if (path.endsWith('/performance/games')) return ok(route, []);
    return route.fulfill({ status: 503, json: { success: false, message: `Serviço indisponível: ${path}` } });
  });
});

test('skip link and labelled controls follow normal DOM order without positive tabindex', async ({ page }) => {
  await page.goto('/build');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  expect(await page.locator('[tabindex]').evaluateAll(items => items.filter(item => item.tabIndex > 0).length)).toBe(0);
  const budget = page.getByRole('spinbutton', { name: 'Orçamento', exact: true });
  await budget.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('combobox', { name: 'Tipo de uso', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('combobox', { name: 'Tipo de vídeo da montagem', exact: true })).toBeFocused();
  await page.locator('summary').filter({ hasText: 'Ajustar sugestão' }).click();
  await expect(page.getByRole('combobox', { name: 'Prioridade', exact: true })).toBeVisible();
});

test('real focus ring is visible with AA contrast on the adjacent dark task surface', async ({ page }) => {
  await seed(page);
  await page.goto('/build');
  const search = page.getByRole('searchbox', { name: 'Buscar componente', exact: true });
  await search.focus();
  const style = await search.evaluate(element => {
    const computed = getComputedStyle(element);
    return { width: computed.outlineWidth, style: computed.outlineStyle, offset: computed.outlineOffset, color: computed.outlineColor,
      surface: getComputedStyle(element.closest('.wizard-catalog-tools')).backgroundColor };
  });
  expect(style.width).toBe('3px');
  expect(style.style).toBe('solid');
  expect(style.offset).toBe('3px');
  expect(contrast(color(style.color), color(style.surface))).toBeGreaterThanOrEqual(3);
});

test('dialog keeps keyboard focus inside and Escape returns to the exact details opener', async ({ page }) => {
  await page.goto('/components');
  await page.getByRole('combobox', { name: 'Categoria', exact: true }).selectOption('cpu');
  const opener = page.getByRole('button', { name: `Detalhes de ${selected.cpu.name}`, exact: true });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: selected.cpu.name, exact: true });
  const close = dialog.getByRole('button', { name: 'Fechar', exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('catalog reflows with full names at narrow widths and 200 percent text sizing', async ({ page }, testInfo) => {
  await page.goto('/components');
  await page.getByRole('combobox', { name: 'Categoria', exact: true }).selectOption('cpu');
  for (const width of [320, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const textPercent of [100, 200]) {
      await page.evaluate(percent => { document.documentElement.style.fontSize = `${percent}%`; }, textPercent);
      await expect(page.locator('.component-card').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const titles = await page.locator('.component-card h3').evaluateAll(items => items.map(item => ({
        clipped: item.scrollHeight > item.clientHeight + 1,
        lineClamp: getComputedStyle(item).webkitLineClamp
      })));
      expect(titles.every(item => !item.clipped && item.lineClamp === 'none')).toBe(true);
      const targets = await page.locator('.catalog-filters button, .component-card button').evaluateAll(items => items.filter(item => item.getClientRects().length).map(item => item.getBoundingClientRect().height));
      expect(targets.every(height => height >= 44)).toBe(true);
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = '100%'; });
    await testInfo.attach(`catalog-${width}px`, { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });
  }
});

test('short-height wizard releases sticky navigation instead of covering the current task', async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width: 800, height: 500 });
  await page.goto('/build');
  await expect(page.locator('.wizard-actions')).toHaveCSS('position', 'static');
  const search = page.getByRole('searchbox', { name: 'Buscar componente', exact: true });
  await search.focus();
  await search.scrollIntoViewIfNeeded();
  await expect(search).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
