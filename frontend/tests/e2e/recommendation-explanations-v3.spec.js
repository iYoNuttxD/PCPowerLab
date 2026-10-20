import { test, expect } from '@playwright/test';
import { listComponents } from '../../../src/services/component.service.js';
import { recommendBuildByBudget } from '../../../src/services/recommendationService.js';

// Browser cases are authored for an authorized runner. SSR/pure tests cover the
// response/render contract; collection alone does not verify these interactions.
const catalog = listComponents({ includeLegacy: true });
const seedRecommendation = recommendBuildByBudget({ budget: { amount: 10000 }, usageType: 'gaming' });
const ok = (route, data) => route.fulfill({ json: { success: true, data } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ selectedComponents }) => localStorage.setItem('pcpowerlab-build-state', JSON.stringify({
    wizardStep: 'review', selectedComponents, budget: { amount: 10000, currency: 'BRL', priority: 'cost-benefit' }, usageType: 'gaming'
  })), { selectedComponents: { ...seedRecommendation.components, fans: [] } });
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/components')) return ok(route, catalog);
    if (path.endsWith('/performance/games')) return ok(route, []);
    if (path.endsWith('/recommendations/budget') || path.endsWith('/recommendations/by-usage')) return ok(route, recommendBuildByBudget(route.request().postDataJSON()));
    return route.fulfill({ status: 500, json: { success: false, message: `Unexpected route: ${path}` } });
  });
});

test('explanations open by keyboard and preserve readable per-part facts and exclusions', async ({ page }) => {
  await page.goto('/build');
  await page.getByRole('button', { name: 'Gerar recomendação', exact: true }).click();
  const disclosure = page.locator('.recommendation-explanation');
  await expect(disclosure).not.toHaveAttribute('open', '');
  await disclosure.locator(':scope > summary').focus();
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('open', '');
  const reasons = disclosure.locator('.recommendation-component-reason');
  await expect(reasons).toHaveCount(7);
  const cpu = reasons.first();
  await cpu.locator(':scope > summary').focus();
  await page.keyboard.press('Enter');
  await expect(cpu).toContainText('opções elegíveis da categoria');
  await expect(cpu).toContainText('não uma prova de que esta peça isolada é a melhor compra');
  const exclusions = cpu.locator('.recommendation-excluded-alternatives');
  await exclusions.locator(':scope > summary').click();
  await expect(exclusions).toContainText('AMD Ryzen 7 7800X3D');
  await expect(exclusions).toContainText('BIOS instalado ou versão mínima');
  await expect(exclusions).toContainText('Índice de desempenho indisponível');
  await expect(exclusions).toContainText('Preço de referência');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('budget and profile edits discard old explanations and request fresh grounded values', async ({ page }) => {
  await page.goto('/build');
  await page.getByRole('button', { name: 'Gerar recomendação', exact: true }).click();
  await expect(page.locator('.recommendation-component-reason')).toHaveCount(7);
  await page.getByRole('button', { name: 'Editar orçamento', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Orçamento', exact: true }).fill('5000');
  await page.getByRole('combobox', { name: 'Tipo de uso', exact: true }).selectOption('study');
  await page.getByRole('button', { name: 'Avançar', exact: true }).click();
  await expect(page.locator('.recommendation-component-reason')).toHaveCount(0);
  await page.getByRole('button', { name: 'Gerar recomendação', exact: true }).click();
  const disclosure = page.locator('.recommendation-explanation');
  await disclosure.locator(':scope > summary').click();
  await expect(disclosure).toContainText('Limite: R$');
  await expect(disclosure).toContainText('5.000,00');
  await expect(disclosure).toContainText('Perfil estudo');
  await expect(disclosure).toContainText('não comprova desempenho em uma aplicação específica');
});
