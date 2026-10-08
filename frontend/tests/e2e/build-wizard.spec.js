import { currentBuild, activePart } from './helpers/catalog.js';
import { test, expect } from '@playwright/test';
import { components } from '../../../src/data/components.mock.js';

const storageKey = 'pcpowerlab-build-state';
const types = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
const labels = ['Processador', 'Placa de vídeo', 'Placa-mãe', 'Memória RAM', 'Armazenamento', 'Fonte de alimentação', 'Gabinete'];
const selection = currentBuild(components);
selection.fans = [];
const budget = { amount: '5000', currency: 'BRL', priority: 'cost-benefit' };
const pageErrors = new WeakMap();

async function respond(route, data, status = 200) {
  await route.fulfill({ status, json: status < 400 ? { success: true, data } : { success: false, message: data } });
}

async function seed(page, state) {
  await page.addInitScript(({ key, value }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
  }, { key: storageKey, value: { budget, ...state } });
}

async function stored(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
}

async function step(page, label) {
  await page.locator('.wizard-progress summary').click();
  await page.getByRole('navigation', { name: 'Etapas do assistente' }).getByRole('button', { name: new RegExp(label) }).click();
  await expect(page.locator('#wizard-step-heading')).toHaveText(label);
}

async function menuLink(page, group, href) {
  const menu = page.getByRole('button', { name: 'Abrir menu', exact: true });
  if (await menu.isVisible()) await menu.click();
  if (group) await page.locator(`#nav-toggle-${group}`).click();
  await page.locator(`header a[href="${href}"]`).click();
}

async function expectPositionedHeading(page) {
  await expect(page.locator('#wizard-step-heading')).toBeFocused();
  await expect.poll(() => page.evaluate(() => {
    const heading = document.querySelector('#wizard-step-heading').getBoundingClientRect();
    const controls = document.querySelector('.wizard-actions').getBoundingClientRect();
    return heading.top >= controls.bottom + 8 && heading.bottom < innerHeight;
  })).toBe(true);
}

async function analyze(page) {
  await page.getByRole('button', { name: 'Analisar build', exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/components') return respond(route, components);
    if (path === '/compatibility/check' || path === '/compatibility/alerts') return respond(route, { compatible: true, alerts: [] });
    if (path === '/budget') {
      const input = route.request().postDataJSON();
      return respond(route, { ...input, amount: Number(input.amount.toFixed(2)), warnings: [] });
    }
    if (path === '/bottlenecks/analyze') return respond(route, { bottlenecks: [], performanceSummary: {} });
    if (path === '/performance/games') return respond(route, []);
    if (path === '/saved-builds') return respond(route, { id: 'saved-in-test' });
    return respond(route, `Endpoint inesperado no teste: ${path}`, 500);
  });
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('avança pelas nove etapas, mantém ações visíveis e retorna sem perder peças', async ({ page }) => {
  await page.goto('/build');
  const next = page.getByRole('button', { name: 'Avançar', exact: true });
  await expect(next).toHaveCount(1);
  await expect(next).toBeDisabled();
  await expect(page.locator('#wizard-guidance')).toContainText('Selecione uma peça de Processador');
  await expect(page.getByRole('button', { name: 'Voltar', exact: true })).toBeDisabled();
  await expect(next).toBeInViewport();

  for (let index = 0; index < types.length; index += 1) {
    await expect(page.locator('#wizard-step-heading')).toHaveText(labels[index]);
    await expect(page.locator('.wizard-step-intro p')).not.toBeEmpty();
    await page.getByRole('button', { name: `Selecionar: ${selection[types[index]].name}`, exact: true }).click();
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', String(index + 1));
    await page.evaluate(() => window.scrollTo(0, document.querySelector('.component-grid').getBoundingClientRect().bottom + scrollY - innerHeight));
    await expect(next).toBeInViewport();
    await expect(next).toBeEnabled();
    await next.click();
    await expectPositionedHeading(page);
  }
  await expect(page.locator('#wizard-step-heading')).toHaveText('Orçamento');
  await expect(next).toBeDisabled();
  await page.getByRole('spinbutton', { name: 'Orçamento', exact: true }).fill('5000');
  await next.click();
  await expect(page.locator('.wizard-actions')).toContainText('Etapa 9 de 9');
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '8');
  await analyze(page);
  await expect(page.getByText('Build analisada com sucesso.', { exact: false })).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '9');
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expectPositionedHeading(page);
  await expect(page.getByRole('spinbutton', { name: 'Orçamento', exact: true })).toHaveValue('5000');
  expect((await stored(page)).selectedComponents).toEqual(selection);
  await page.reload();
  await expect(page.locator('#wizard-step-heading')).toHaveText('Orçamento');
  expect((await stored(page)).selectedComponents).toEqual(selection);
});

test('substitui e remove uma peça sem apagar as outras; invalida análises antigas', async ({ page }) => {
  await seed(page, { wizardStep: 'review', selectedComponents: selection });
  await page.goto('/build');
  await analyze(page);
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '9');
  await page.getByRole('button', { name: 'Alterar Processador', exact: true }).click();
  await expectPositionedHeading(page);
  await expect(page.getByRole('button', { name: `Selecionado: ${selection.cpu.name}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  const replacement = activePart(components, 'cpu-ryzen-7-5700x');
  await page.getByRole('button', { name: `Selecionar: ${replacement.name}`, exact: true }).click();
  let state = await stored(page);
  expect(state.selectedComponents).toEqual({ ...selection, cpu: replacement });
  for (const key of ['compatibility', 'alerts', 'bottlenecks', 'summary', 'gamePerformance']) expect(state[key]).toBeNull();
  await step(page, 'Revisão');
  await expect(page.getByRole('heading', { name: 'Compatibilidade ainda não verificada' })).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '8');
  await page.getByRole('button', { name: 'Alterar Processador', exact: true }).click();
  await page.getByRole('button', { name: 'Remover Processador', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Avançar', exact: true })).toBeDisabled();
  await expect(page.locator('#wizard-guidance')).toContainText('Selecione uma peça');
  state = await stored(page);
  expect(state.selectedComponents.cpu).toBeUndefined();
  for (const type of types.slice(1)) expect(state.selectedComponents[type]).toEqual(selection[type]);
  await page.getByRole('button', { name: 'Escolher Processador', exact: true }).click();
  await expectPositionedHeading(page);
});

test('explica campos inválidos, peças faltantes e rejeição do orçamento pela API', async ({ page }) => {
  let checks = 0;
  let bottlenecks = 0;
  await page.route('**/compatibility/check', route => { checks += 1; return respond(route, { compatible: true }); });
  await page.route('**/bottlenecks/analyze', route => { bottlenecks += 1; return respond(route, {}); });
  await seed(page, { wizardStep: 'budget', selectedComponents: selection, budget: { ...budget, amount: '' } });
  await page.goto('/build');
  const input = page.getByRole('spinbutton', { name: 'Orçamento', exact: true });
  for (const value of ['', '0', '-10']) {
    await input.fill(value);
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('button', { name: 'Avançar', exact: true })).toBeDisabled();
    await expect(page.locator('#wizard-guidance')).toHaveText('Informe um orçamento maior que zero.');
  }
  await step(page, 'Revisão');
  await analyze(page);
  await expect(page.getByRole('alert')).toContainText('Informe um orçamento maior que zero.');
  expect(checks).toBe(0);
  await page.getByRole('button', { name: 'Remover Processador', exact: true }).click();
  await analyze(page);
  await expect(page.getByRole('alert')).toContainText('Selecione as peças que faltam: Processador');
  await page.getByRole('button', { name: 'Salvar build', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Antes de salvar, selecione: Processador');
  expect(checks).toBe(0);
  await step(page, 'Processador');
  await page.getByRole('button', { name: `Selecionar: ${selection.cpu.name}`, exact: true }).click();
  await step(page, 'Orçamento');
  await input.fill('100001');
  await page.route('**/api/v1/budget', route => respond(route, 'Valor de orçamento fora da faixa aceitável.', 400));
  await page.getByRole('button', { name: 'Avançar', exact: true }).click();
  await analyze(page);
  await expect(page.getByRole('alert')).toContainText('Valor de orçamento fora da faixa aceitável.');
  expect(checks).toBe(1);
  expect(bottlenecks).toBe(0);
});

test('mantém etapa e contexto ao visitar outra página e aceita storage anterior', async ({ page }) => {
  await seed(page, { selectedComponents: selection });
  await page.goto('/build');
  await expect(page.locator('#wizard-step-heading')).toHaveText('Processador');
  await step(page, 'Memória RAM');
  await menuLink(page, 'explore', '/components');
  await expect(page).toHaveURL(/\/components$/);
  await menuLink(page, null, '/build');
  await expect(page.locator('#wizard-step-heading')).toHaveText('Memória RAM');
  await page.reload();
  await expect(page.locator('#wizard-step-heading')).toHaveText('Memória RAM');
  expect((await stored(page)).selectedComponents).toEqual(selection);
  await page.evaluate(key => { const data = JSON.parse(localStorage.getItem(key)); data.wizardStep = 'inexistente'; localStorage.setItem(key, JSON.stringify(data)); }, storageKey);
  await page.reload();
  await expect(page.locator('#wizard-step-heading')).toHaveText('Processador');
  expect((await stored(page)).selectedComponents).toEqual(selection);
});

test('catálogo apresenta carregamento, falha, recuperação e ausência de peças', async ({ page }) => {
  let release;
  await page.route(/\/api\/v1\/components(?:\?.*)?$/, async route => {
    await new Promise(resolve => { release = resolve; });
    await respond(route, 'Catálogo temporariamente indisponível.', 503);
  });
  await page.goto('/build');
  await expect(page.locator('#wizard-guidance')).toContainText('Aguarde o catálogo');
  await expect(page.getByRole('button', { name: 'Avançar', exact: true })).toBeDisabled();
  await expect.poll(() => Boolean(release)).toBe(true);
  release();
  await expect(page.getByRole('alert')).toContainText('Catálogo temporariamente indisponível.');
  await expect(page.locator('#wizard-guidance')).toContainText('Tentar novamente');
  await page.route(/\/api\/v1\/components(?:\?.*)?$/, route => respond(route, components.filter(component => component.category !== 'gpu')));
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await page.getByRole('button', { name: `Selecionar: ${selection.cpu.name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Avançar', exact: true }).click();
  await expect(page.getByText('Nenhuma peça nesta categoria', { exact: true })).toBeVisible();
  await expect(page.locator('#wizard-guidance')).toContainText('Não há peças');
  await page.route(/\/api\/v1\/components(?:\?.*)?$/, route => respond(route, components));
  await page.getByRole('button', { name: 'Atualizar catálogo' }).click();
  await expect(page.getByRole('button', { name: /^Selecionar:/ }).first()).toBeVisible();
});

test('incompatibilidade continua bloqueando gargalos e não aparece como sucesso', async ({ page }) => {
  let bottlenecks = 0;
  await seed(page, { wizardStep: 'review', selectedComponents: selection });
  const incompatible = { compatible: false, alerts: [{ severity: 'high', title: 'Socket incompatível', message: 'Troque o processador ou a placa-mãe.' }] };
  await page.route('**/compatibility/check', route => respond(route, incompatible));
  await page.route('**/compatibility/alerts', route => respond(route, incompatible));
  await page.route('**/bottlenecks/analyze', route => { bottlenecks += 1; return respond(route, {}); });
  await page.goto('/build');
  await analyze(page);
  await expect(page.locator('.alert-warning').filter({ hasText: 'A compatibilidade não foi confirmada.' })).toBeVisible();
  await expect(page.locator('.alert-success')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Análise de gargalos indisponível' })).toBeVisible();
  expect(bottlenecks).toBe(0);
  expect((await stored(page)).bottlenecks.reason).toBe('incompatible_build');
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '8');
});

test('trata erros de análise, recomendação e salvamento sem rejeições não capturadas', async ({ page }) => {
  await seed(page, { wizardStep: 'review', selectedComponents: selection });
  await page.goto('/build');
  await page.route('**/compatibility/check', route => respond(route, 'Serviço de compatibilidade indisponível. Tente novamente.', 503));
  await analyze(page);
  await expect(page.getByRole('alert')).toContainText('Serviço de compatibilidade indisponível');
  await expect(page.getByRole('button', { name: 'Analisar build', exact: true })).toBeEnabled();
  await page.route('**/compatibility/check', route => respond(route, { compatible: true }));
  await page.route('**/bottlenecks/analyze', route => respond(route, 'Parâmetros de desempenho ausentes.', 400));
  await analyze(page);
  await expect(page.locator('.alert-warning').filter({ hasText: 'Faltam dados de desempenho' })).toBeVisible();
  await page.route('**/bottlenecks/analyze', route => route.abort());
  await analyze(page);
  await expect(page.getByText('Use Analisar build para tentar novamente.', { exact: false })).toBeVisible();
  expect((await stored(page)).bottlenecks.status).toBe('error');
  await page.route('**/bottlenecks/analyze', route => respond(route, { bottlenecks: [] }));
  await analyze(page);
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '9');
  await page.route('**/recommendations/budget', route => respond(route, 'Não há recomendação para este orçamento.', 400));
  await page.getByRole('button', { name: 'Gerar recomendação', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Não há recomendação');
  await expect(page.locator('.alert-success')).toHaveCount(0);
  await page.route('**/saved-builds', route => respond(route, 'Falha ao salvar. Tente novamente.', 503));
  await page.getByRole('button', { name: 'Salvar build', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Falha ao salvar');
});

test('resposta tardia não restaura análises após remover uma peça', async ({ page }) => {
  let release;
  await seed(page, { wizardStep: 'review', selectedComponents: selection });
  await page.route('**/bottlenecks/analyze', async route => { await new Promise(resolve => { release = resolve; }); await respond(route, { bottlenecks: [] }); });
  await page.goto('/build');
  await analyze(page);
  await expect(page.getByText('Aguarde, processando sua montagem...')).toBeVisible();
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.getByRole('button', { name: 'Remover Processador', exact: true }).click();
  release();
  await expect(page.getByRole('button', { name: 'Analisar build', exact: true })).toBeEnabled();
  expect((await stored(page)).bottlenecks).toBeNull();
  expect((await stored(page)).compatibility).toBeNull();
  await expect(page.locator('.alert-success')).toHaveCount(0);
});

test('normalização de centavos preserva os resultados da configuração analisada', async ({ page }) => {
  await seed(page, { wizardStep: 'review', selectedComponents: selection, budget: { ...budget, amount: '5000.456' } });
  await page.goto('/build');
  await analyze(page);
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '9');
  const state = await stored(page);
  expect(state.budget.amount).toBe(5000.46);
  expect(state.bottlenecks.status).toBe('success');
  expect(state.compatibility.compatible).toBe(true);
});

test('movimento reduzido usa rolagem instantânea e posiciona foco acima das peças', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    window.wizardScrollBehaviors = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options) { window.wizardScrollBehaviors.push(options?.behavior); return original.call(this, options); };
  });
  await page.goto('/build');
  await page.getByRole('button', { name: /^Selecionar:/ }).last().click();
  await page.getByRole('button', { name: 'Avançar', exact: true }).click();
  await expectPositionedHeading(page);
  expect(await page.evaluate(() => window.wizardScrollBehaviors)).toEqual(['instant']);
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expectPositionedHeading(page);
  await page.locator('.wizard-progress summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Etapas do assistente' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('navigation', { name: 'Etapas do assistente' }).getByRole('button').first()).toBeFocused();
});

test('continua navegável com armazenamento local bloqueado', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage bloqueado'); };
    Storage.prototype.setItem = () => { throw new Error('Storage bloqueado'); };
  });
  await page.goto('/build');
  await page.getByRole('button', { name: `Selecionar: ${selection.cpu.name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Avançar', exact: true }).click();
  await expect(page.locator('#wizard-step-heading')).toHaveText('Placa de vídeo');
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Selecionado:/ })).toHaveAttribute('aria-pressed', 'true');
});

test('sair durante análise não mantém carregamento permanente nem aplica resposta antiga', async ({ page }) => {
  let release;
  await seed(page, { wizardStep: 'review', selectedComponents: selection });
  await page.route('**/bottlenecks/analyze', async route => { await new Promise(resolve => { release = resolve; }); await respond(route, { bottlenecks: [] }); });
  await page.goto('/build');
  await analyze(page);
  await expect.poll(() => Boolean(release)).toBe(true);
  await menuLink(page, 'explore', '/components');
  await expect(page).toHaveURL(/\/components$/);
  await expect(page.getByRole('heading', { name: 'Catálogo de componentes', exact: true })).toBeVisible();
  await expect(page.locator('#wizard-step-heading')).toHaveCount(0);
  release();
  await menuLink(page, null, '/build');
  await expect(page.locator('#wizard-step-heading')).toHaveText('Revisão');
  await expect(page.getByRole('button', { name: 'Analisar build', exact: true })).toBeEnabled();
  expect((await stored(page)).bottlenecks).toBeNull();
  expect((await stored(page)).selectedComponents).toEqual(selection);
});

test('aplica recomendação, permite reanalisar e salva as peças substituídas', async ({ page }) => {
  const recommended = { ...selection, cpu: activePart(components, 'cpu-ryzen-7-5700x') };
  await seed(page, { wizardStep: 'review', selectedComponents: selection });
  await page.route('**/recommendations/budget', route => respond(route, { components: recommended, totalEstimatedPrice: 4500, summary: 'Configuração sugerida para o teste.' }));
  await page.goto('/build');
  await page.getByRole('button', { name: 'Gerar recomendação', exact: true }).click();
  await page.getByRole('button', { name: 'Usar recomendação inteira', exact: true }).click();
  expect((await stored(page)).selectedComponents).toEqual(recommended);
  await expect(page.getByRole('heading', { name: 'Compatibilidade ainda não verificada' })).toBeVisible();
  await analyze(page);
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '9');
  const saveRequest = page.waitForRequest(request => request.url().endsWith('/saved-builds') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Salvar build', exact: true }).click();
  const payload = (await saveRequest).postDataJSON();
  expect(payload.components.cpuId).toBe(recommended.cpu.id);
  expect(payload.components.gpuId).toBe(selection.gpu.id);
  expect(payload.budget.amount).toBe(5000);
  await expect(page.getByText('Build salva com sucesso.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ir para resumo', exact: true }).click();
  await expect(page).toHaveURL(/\/summary$/);
  expect((await stored(page)).selectedComponents).toEqual(recommended);
});

test('Escape fecha a lista de etapas e retorna ao acionador sem mudar seleção', async ({ page }) => {
  await seed(page, { wizardStep: 'ram', selectedComponents: selection });
  await page.goto('/build');
  const summary = page.locator('.wizard-progress summary');
  await summary.click();
  await page.getByRole('navigation', { name: 'Etapas do assistente' }).getByRole('button').first().focus();
  await page.keyboard.press('Escape');
  await expect(summary).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Etapas do assistente' })).toBeHidden();
  await expect(page.locator('#wizard-step-heading')).toHaveText('Memória RAM');
  expect((await stored(page)).selectedComponents).toEqual(selection);
});

test('editar refrigeração limpa sucesso antigo e mantém revisão pendente', async ({ page }) => {
  await seed(page, { wizardStep: 'review', selectedComponents: selection });
  await page.goto('/build');
  await analyze(page);
  await expect(page.getByText('Build analisada com sucesso.', { exact: false })).toBeVisible();
  await page.getByRole('combobox', { name: 'Cooler do processador', exact: true }).selectOption(activePart(components, 'cooler-noctua-nh-l9a-am4-chromax-black').id);
  await expect(page.getByText('Build analisada com sucesso.', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '8');
  expect((await stored(page)).compatibility).toBeNull();
  for (const type of types) expect((await stored(page)).selectedComponents[type]).toEqual(selection[type]);
});

for (const result of [
  { compatible: true, status: 'unverified', unverifiedChecks: [{ code: 'missing-data' }] },
  { compatible: true, status: 'incompatible' },
  { compatible: true, violations: [{ severity: 'low', blocking: true }] },
  { compatible: true, issues: [{ severity: 'critical' }] }
]) {
  test(`não conclui revisão nem simula gargalos com bloqueio ${JSON.stringify(result)}`, async ({ page }) => {
    let calls = 0;
    await seed(page, { wizardStep: 'review', selectedComponents: selection });
    await page.route('**/compatibility/check', route => respond(route, result));
    await page.route('**/bottlenecks/analyze', route => { calls += 1; return respond(route, {}); });
    await page.goto('/build');
    await analyze(page);
    await expect(page.getByRole('heading', { name: 'Análise de gargalos indisponível', exact: true })).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '8');
    expect(calls).toBe(0);
    expect((await stored(page)).bottlenecks.reason).toBe(result.status === 'unverified' ? 'unverified_compatibility' : 'incompatible_build');
  });
}
