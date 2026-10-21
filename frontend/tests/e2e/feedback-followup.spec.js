import { test, expect } from '@playwright/test';
import { components } from '../../../src/data/components.mock.js';

test.beforeEach(async ({ page }) => {
  await page.route(/\/api\/v1\/components(?:\?.*)?$/, route => route.fulfill({ json: { success: true, data: components.filter(c => c.active !== false) } }));
});

test('resource search finds Wi-Fi boards and same-chipset comparison explains practical differences', async ({ page }) => {
  await page.goto('/components');
  await page.getByRole('combobox', { name: 'Categoria', exact: true }).selectOption('motherboard');
  await page.getByRole('searchbox', { name: 'Buscar componente', exact: true }).fill('Wi-Fi');
  await expect(page.locator('.component-grid > article')).toHaveCount(3);
  await expect(page.locator('.component-grid')).toContainText('B650 GAMING X AX V2');
  await page.getByRole('searchbox', { name: 'Buscar componente', exact: true }).fill('B650');
  await expect(page.locator('.component-grid > article')).toHaveCount(2);
  const cards = page.locator('.component-grid > article');
  await cards.nth(0).getByRole('button', { name: /^Comparar:/ }).click();
  await cards.nth(1).getByRole('button', { name: /^Comparar:/ }).click();
  await page.getByRole('button', { name: 'Comparar peças (2)', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Comparar componentes', exact: true });
  await expect(dialog.getByRole('row', { name: /^Slots M.2/ })).toContainText('2');
  await expect(dialog.getByRole('row', { name: /^Slots M.2/ })).toContainText('3');
  await expect(dialog.getByRole('row', { name: /^Atualização de BIOS/ })).toHaveCount(0);
  await expect(dialog.getByRole('row', { name: /^Marca / })).toHaveCount(0);
  await expect(dialog.getByRole('row', { name: /^Pontuação de desempenho/ })).toHaveCount(0);
  const photoWidth = await dialog.locator('.component-media').first().evaluate(node => node.getBoundingClientRect().width);
  expect(photoWidth).toBeLessThanOrEqual(88);
  await dialog.getByRole('button', { name: 'Mostrar todas as especificações', exact: true }).click();
  await expect(dialog.getByRole('row', { name: /^Atualização de BIOS/ })).toBeVisible();
  await dialog.getByRole('button', { name: 'Mostrar recursos essenciais', exact: true }).click();
  await dialog.getByRole('region', { name: 'Tabela de comparação de peças', exact: true }).press('ArrowRight');
  const closeBox = await dialog.getByRole('button', { name: 'Fechar', exact: true }).boundingBox();
  expect(closeBox.y).toBeGreaterThanOrEqual(0);
  expect(closeBox.y + closeBox.height).toBeLessThanOrEqual(page.viewportSize().height);
  await dialog.getByText('Mesmo chipset: como escolher entre os modelos?', { exact: true }).click();
  await expect(dialog).toContainText('O chipset não resume a placa');
  await expect(dialog).toContainText('sem Wi-Fi integrado');
  await expect(dialog).toContainText('Wi-Fi 6E integrado');
  await expect(dialog).not.toContainText('Minimum Bios By Cpu');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Comparar peças (2)', exact: true })).toBeFocused();
});

test('compact list keeps photos, full model names and actions usable at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/components');
  await page.getByRole('combobox', { name: 'Categoria', exact: true }).selectOption('case');
  await page.locator('summary').filter({ hasText: 'Mais filtros e exibição' }).click();
  await page.getByRole('combobox', { name: 'Exibição das peças', exact: true }).selectOption('list');
  await expect(page.locator('.component-list > article')).toHaveCount(6);
  await expect(page.locator('.component-list')).toContainText('Montech XR White');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const card = page.locator('.component-list > article').filter({ hasText: 'Montech XR White' });
  await card.getByRole('button', { name: /^Detalhes de/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Montech XR White', exact: true });
  await expect(dialog).toContainText('3 ventoinhas PWM ARGB');
  await page.keyboard.press('Escape');
  await expect(card.getByRole('button', { name: /^Detalhes de/ })).toBeFocused();
});
