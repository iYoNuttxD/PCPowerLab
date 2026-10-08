import { test, expect } from '@playwright/test';

const key = 'pcpowerlab-build-state';
const slots = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
const prices = [1200, 2100, 800, 600, 800, 650, 833.64];
const catalog = slots.map((category, index) => ({ id: `budget-${category}`, category, name: `Peça atual ${category}`, brand: 'Teste', price: prices[index], active: true, specs: {} }));
const oldCpu = { ...catalog[0], id: 'old-budget-cpu', name: 'Processador anterior', price: 1000 };
const budget = { amount: 5000, currency: 'BRL', priority: 'performance' };
const preset = {
  id: 'budget-regression', name: 'Configuração por perfil', usageProfile: 'gaming',
  description: 'Configuração com referência atual de preço.',
  components: Object.fromEntries(catalog.map(part => [part.category, { ...part, price: 1 }])),
  estimatedTotalPrice: 5100, targetBudgetRange: { min: 4000, max: 5500 },
  compatibility: { status: 'compatible', compatible: true, alerts: [], unverifiedChecks: [] }
};
const ok = (route, data) => route.fulfill({ json: { success: true, data } });
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);

async function prepare(page, { unknown = false, recommendation } = {}) {
  const parts = [...catalog.map(part => unknown && part.category === 'ram' ? { ...part, price: null, catalogStatus: 'legacy', active: false, selectable: false } : part), oldCpu];
  await page.addInitScript(({ key, budget, parts, oldCpu }) => {
    localStorage.setItem(key, JSON.stringify({ budget, selectedComponents: { ...Object.fromEntries(parts.filter(part => part.id !== oldCpu.id).map(part => [part.category, part])), cpu: oldCpu, fans: [] } }));
  }, { key, budget, parts, oldCpu });
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/components') return ok(route, parts);
    if (path === '/ready-builds') return ok(route, [preset]);
    if (path === '/recommendations/builds-by-budget-range') return ok(route, [recommendation || preset]);
    if (['/usage-profiles', '/notifications', '/performance/games'].includes(path)) return ok(route, []);
    if (path === '/purchase-links/build') return ok(route, {});
    return route.fulfill({ status: 500, json: { success: false, message: `Endpoint inesperado: ${path}` } });
  });
  await page.goto('/ready-builds');
  await expect(page.locator('.ready-build-card')).toBeVisible();
}

test('preset displays current price and real budget mismatch without obsolete range claims', async ({ page }) => {
  await prepare(page);
  const card = page.locator('.ready-build-card');
  await expect(card.locator('.price')).toContainText('6.983,64');
  await expect(card).toContainText('Acima do seu orçamento');
  const historicalRange = card.getByText('Faixa-alvo original', { exact: true }).locator('..');
  await expect(historicalRange).toContainText('4.000,00');
  await expect(historicalRange).toContainText('5.500,00');
  await expect(historicalRange).toContainText('Acima da faixa informada');
  await expect(card.getByText('Seu orçamento: R$ 5.000,00', { exact: true })).toBeVisible();
  await expect(card).not.toContainText('5.100,00');
  await card.getByRole('button', { name: 'Ver detalhes', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('6.983,64');
  await expect(page.getByRole('dialog')).toContainText('Acima do seu orçamento');
  expect((await stored(page)).budget).toEqual(budget);
});

for (const action of ['apply', 'edit']) {
  test(`${action} preset preserves the exact entered budget and uses current catalog prices`, async ({ page }) => {
    await prepare(page);
    if (action === 'edit') {
      await page.locator('.ready-build-card').getByRole('button', { name: 'Ver detalhes', exact: true }).click();
      await page.getByRole('button', { name: 'Editar build inteira no assistente', exact: true }).click();
      await expect(page).toHaveURL(/\/build$/);
    } else {
      await page.locator('.ready-build-card').getByRole('button', { name: 'Usar build inteira', exact: true }).click();
      await expect(page).toHaveURL(/\/summary$/);
    }
    const state = await stored(page);
    expect(state.budget).toEqual(budget);
    expect(state.selectedComponents.cpu.price).toBe(1200);
    expect(state.selectedComponents.cpu.id).toBe('budget-cpu');
  });
}

test('preview and cancel preserve user budget and selected parts', async ({ page }) => {
  await prepare(page);
  const before = await stored(page);
  const card = page.locator('.ready-build-card');
  await card.getByRole('combobox', { name: 'Peça sugerida para substituir', exact: true }).selectOption('cpu');
  await card.getByRole('button', { name: 'Pré-visualizar esta peça', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).click();
  const after = await stored(page);
  expect(after.budget).toEqual(before.budget);
  expect(after.selectedComponents).toEqual(before.selectedComponents);
});

test('unknown current legacy price is partial and never becomes a budget fit from stale data', async ({ page }) => {
  await prepare(page, { unknown: true });
  const card = page.locator('.ready-build-card');
  await expect(card).toContainText('Subtotal conhecido · preço incompleto');
  await expect(card.locator('.price')).toContainText('6.383,64');
  await expect(card).toContainText('Preço incompleto: orçamento não verificado');
  await expect(card).not.toContainText('Dentro do seu orçamento');
});

for (const unknown of [false, true]) {
  test(`range recommendation uses actual ${unknown ? 'unknown' : 'above-range'} price instead of stale fit claims`, async ({ page }) => {
    await prepare(page, { unknown, recommendation: { ...preset, budgetStatus: 'compatible', totalEstimatedPrice: 5100, summary: 'Dentro do orçamento.' } });
    await page.getByRole('spinbutton', { name: 'Orçamento mínimo', exact: true }).fill('4000');
    await page.getByRole('spinbutton', { name: 'Orçamento máximo', exact: true }).fill('5500');
    await page.getByRole('button', { name: 'Gerar recomendação', exact: true }).click();
    const result = page.locator('.recommendation-result-card');
    await expect(result).toContainText(unknown ? 'Preço incompleto: orçamento não verificado' : 'Acima da faixa informada');
    await expect(result).not.toContainText('Dentro do orçamento.');
    await expect(result.locator('.price')).toContainText(unknown ? '6.383,64' : '6.983,64');
    await expect(page.getByRole('spinbutton', { name: 'Orçamento máximo', exact: true })).toHaveValue('5500');
    expect((await stored(page)).budget).toEqual(budget);
  });
}
