import { test, expect } from '@playwright/test';
import { listComponents } from '../../../src/services/component.service.js';
import { currentBuild, activePart } from './helpers/catalog.js';
import { mockWizardAnalysis } from './helpers/analysis.js';
import { buildToApiPayload } from '../../src/utils/buildHelpers.js';

const catalog = listComponents({ includeLegacy: true });
const selected = { ...currentBuild(catalog), fans: [] };
const key = 'pcpowerlab-build-state';
const readState = page => page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)), key);
const ok = (route, data) => route.fulfill({ json: { success: true, data } });
async function seed(page, extra = {}) {
  await page.addInitScript(({ storageKey, state }) => localStorage.setItem(storageKey, JSON.stringify(state)), {
    storageKey: key, state: { wizardStep: 'review', selectedComponents: selected, budget: { amount: 5000, currency: 'BRL', priority: 'cost-benefit' }, usageType: 'work', ...extra }
  });
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/components')) return ok(route, catalog);
    if (path.endsWith('/performance/games')) return ok(route, []);
    return route.fulfill({ status: 500, json: { success: false, message: `Rota não prevista: ${path}` } });
  });
});

test('starts with budget/use and editing resumes the same piece without losing selections', async ({ page }) => {
  await page.goto('/build');
  await expect(page.locator('#wizard-step-heading')).toHaveText('Orçamento');
  await expect(page.locator('.component-card')).toHaveCount(0);
  await expect(page.locator('.wizard-budget-progress')).toContainText('Não definido');
  await expect(page.locator('.wizard-budget-progress')).toContainText('Pendente');
  const next = page.getByRole('button', { name: 'Avançar', exact: true });
  await expect(next).toBeDisabled();
  await page.getByRole('spinbutton', { name: 'Orçamento', exact: true }).fill('100');
  await page.getByRole('combobox', { name: 'Tipo de uso', exact: true }).selectOption('programming');
  await next.click();
  await page.getByRole('button', { name: `Selecionar: ${selected.cpu.name}`, exact: true }).click();
  await expect(page.locator('.wizard-budget-progress')).toContainText('Acima do limite');
  await page.getByRole('button', { name: 'Editar orçamento', exact: true }).click();
  await expect(page.locator('.wizard-next-step')).toHaveText('Próximo: Processador');
  await page.getByRole('spinbutton', { name: 'Orçamento', exact: true }).fill('6000');
  await next.click();
  await expect(page.getByRole('button', { name: `Selecionado: ${selected.cpu.name}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await next.click();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  const state = await readState(page);
  expect(state.selectedComponents.cpu.id).toBe(selected.cpu.id);
  expect(Number(state.budget.amount)).toBe(6000);
  expect(state.usageType).toBe('programming');
});

test('first budget entry is fully visible on a notebook without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/build');
  await expect(page.getByRole('spinbutton', { name: 'Orçamento', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('combobox', { name: 'Tipo de uso', exact: true })).toBeInViewport({ ratio: 1 });
});

test('search, keyboard details and step changes preserve completed analysis', async ({ page }) => {
  await seed(page);
  await mockWizardAnalysis(page);
  await page.goto('/build');
  await page.getByRole('button', { name: 'Analisar build', exact: true }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '9');
  const before = await readState(page);
  await page.getByRole('button', { name: 'Alterar Processador', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Buscar componente', exact: true }).fill('does-not-exist');
  await expect(page.getByText('Nenhuma peça com estes filtros', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remover filtro Busca: does-not-exist', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('searchbox')).toBeFocused();
  const advanced = page.locator('.catalog-advanced-filters');
  await advanced.locator('summary').click();
  await page.getByRole('combobox', { name: 'Marca', exact: true }).selectOption(selected.cpu.brand);
  await page.keyboard.press('Escape');
  await expect(advanced).not.toHaveAttribute('open', '');
  await expect(page.getByRole('button', { name: `Remover filtro ${selected.cpu.brand}`, exact: true })).toBeVisible();
  const detail = page.getByRole('button', { name: `Detalhes de ${selected.cpu.name}`, exact: true });
  await detail.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: selected.cpu.name, exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByText('Todas as especificações técnicas', { exact: true }).click();
  await expect(dialog.locator('dt').filter({ hasText: /^Threads$/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(detail).toBeFocused();
  await page.getByRole('button', { name: 'Avançar', exact: true }).click();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(page.getByRole('button', { name: `Remover filtro ${selected.cpu.brand}`, exact: true })).toBeVisible();
  const after = await readState(page);
  for (const field of ['revision', 'selectedComponents', 'budget', 'compatibility', 'alerts', 'bottlenecks']) expect(after[field]).toEqual(before[field]);
});

test('catalog exposes all search and price chips while preserving comparison', async ({ page }) => {
  await page.goto('/components');
  await expect(page.getByRole('heading', { name: 'Buscar e filtrar', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Categoria', exact: true }).selectOption('cpu');
  await page.getByRole('button', { name: `Comparar: ${selected.cpu.name}`, exact: true }).click();
  await page.getByRole('searchbox').fill(selected.cpu.name);
  await page.getByRole('spinbutton', { name: 'Preço mínimo (R$)', exact: true }).fill('1');
  await page.getByRole('spinbutton', { name: 'Preço máximo (R$)', exact: true }).fill('10000');
  const applied = page.getByRole('region', { name: 'Filtros aplicados', exact: true });
  await expect(applied.getByRole('button')).toHaveCount(4);
  await page.getByRole('button', { name: `Remover filtro Busca: ${selected.cpu.name}`, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Comparar peças (1)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  await expect(applied).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Comparar peças (1)', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Resultados do catálogo', exact: true })).toBeVisible();
});

test('unavailable bottleneck response stays pending without blocking summary navigation', async ({ page }) => {
  await seed(page);
  await mockWizardAnalysis(page, { bottlenecks: { available: false, reason: 'missing_performance_parameters', message: 'Parâmetros incompletos para este modelo.' } });
  await page.goto('/build');
  await page.getByRole('button', { name: 'Analisar build', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Análise de gargalos indisponível', exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '8');
  await expect(page.getByText('Build analisada com sucesso.', { exact: false })).toHaveCount(0);
  expect((await readState(page)).selectedComponents).toEqual(selected);
  await page.getByRole('button', { name: 'Ir para resumo', exact: true }).click();
  await expect(page).toHaveURL(/\/summary$/);
});

test('recommendation request includes retained optional cooling and current budget', async ({ page }) => {
  const cooler = activePart(catalog, 'cooler-noctua-nh-l9a-am4-chromax-black');
  const fan = activePart(catalog, 'fan-arctic-p12-pro');
  const withCooling = { ...selected, cooler, fans: [{ ...fan, quantity: 2 }] };
  await seed(page, { selectedComponents: withCooling });
  let payload;
  await page.route('**/recommendations/budget', route => {
    payload = route.request().postDataJSON();
    return ok(route, { components: selected, totalEstimatedPrice: 4000, summary: 'Configuração de teste.' });
  });
  await page.goto('/build');
  await page.getByRole('button', { name: 'Gerar recomendação', exact: true }).click();
  await expect(page.getByText('Recomendação gerada.', { exact: false })).toBeVisible();
  expect(payload.components).toEqual(buildToApiPayload(withCooling));
  expect(payload.budget.amount).toBe(5000);
  expect((await readState(page)).selectedComponents).toEqual(withCooling);
});

test('budget context fits mobile, notebook and large-screen layouts', async ({ page }) => {
  await seed(page, { wizardStep: 'cpu' });
  await page.goto('/build');
  for (const width of [320, 390, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('.wizard-budget-progress')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const widths = await page.locator('.wizard-budget-progress dd').evaluateAll(items => items.map(item => item.scrollWidth <= item.clientWidth));
    expect(widths.every(Boolean)).toBe(true);
    await page.getByRole('button', { name: 'Avançar', exact: true }).click();
    await expect(page.locator('#wizard-step-heading')).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.querySelector('#wizard-step-heading').getBoundingClientRect().top > document.querySelector('.wizard-actions').getBoundingClientRect().bottom)).toBe(true);
    await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  }
});


test('imported foreign-currency budget is never silently converted to BRL', async ({ page }) => {
  await seed(page, { wizardStep: 'budget', budget: { amount: 1000, currency: 'USD', priority: 'cost-benefit' } });
  await page.goto('/build');
  await expect(page.locator('.wizard-budget-progress')).toContainText('US$');
  await expect(page.locator('.wizard-budget-progress')).toContainText('Pendente');
  await expect(page.getByRole('button', { name: 'Avançar', exact: true })).toBeDisabled();
  expect((await readState(page)).budget).toMatchObject({ amount: 1000, currency: 'USD' });
  await page.getByRole('button', { name: 'Definir orçamento em reais', exact: true }).click();
  const amount = page.getByRole('spinbutton', { name: 'Orçamento', exact: true });
  await expect(amount).toHaveValue('');
  await expect(amount).toBeFocused();
  expect((await readState(page)).budget.currency).toBe('BRL');
  expect((await readState(page)).selectedComponents).toEqual(selected);
  await amount.fill('5000');
  await expect(page.getByRole('button', { name: 'Avançar', exact: true })).toBeEnabled();
});
