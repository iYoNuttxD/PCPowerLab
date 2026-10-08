import { test, expect } from '@playwright/test';

const key = 'pcpowerlab-build-state';
const types = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
const labels = ['Processador', 'Placa de vídeo', 'Placa-mãe', 'Memória RAM', 'Armazenamento', 'Fonte de alimentação', 'Gabinete'];
const errors = new WeakMap();
const state = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const currency = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function data(response) {
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.success).not.toBe(false);
  return body.data ?? body;
}
async function api(request, path) { return data(await request.get(`/api/v1${path}`)); }
async function action(page, path, callback) {
  const response = page.waitForResponse(response => response.url().endsWith(`/api/v1${path}`) && response.request().method() === 'POST');
  await callback();
  return data(await response);
}
async function capture(page, testInfo, name, target) {
  if (target) await target.scrollIntoViewIfNeeded();
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}
async function navigation(page, group, href) {
  const menu = page.getByRole('button', { name: 'Abrir menu', exact: true });
  if (await menu.isVisible()) await menu.click();
  if (group) await page.locator(`#nav-toggle-${group}`).click();
  await page.locator(`header a[href="${href}"]`).click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator('main h1')).toBeFocused();
}
async function step(page, label) {
  await page.locator('.wizard-progress summary').click();
  await page.getByRole('navigation', { name: 'Etapas do assistente' }).getByRole('button', { name: new RegExp(label) }).click();
  await expect(page.locator('#wizard-step-heading')).toHaveText(label);
}
async function applyReady(page) {
  // Presets preserve the user's budget; recommendation tests supply one explicitly.
  await page.addInitScript(key => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ budget: { amount: 6000, currency: 'BRL', priority: 'cost-benefit' } }));
  }, key);
  await page.goto('/ready-builds');
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'PC Gamer 1080p Custo-benefício', exact: true }) });
  await card.getByRole('button', { name: 'Usar build inteira', exact: true }).click();
  await expect(page).toHaveURL(/\/summary$/);
  const applied = await state(page);
  expect(applied.budget.amount).toBe(6000);
  return applied;
}

test.beforeEach(async ({ page }) => {
  const failures = [];
  errors.set(page, failures);
  page.on('pageerror', error => failures.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('montagem manual, orçamento, análises, salvamento, recuperação e lojas com API real', async ({ page, request }, testInfo) => {
  const catalog = await api(request, '/components');
  const ready = (await api(request, '/ready-builds'))[0];
  const selected = Object.fromEntries(types.map(type => [type, catalog.find(part => part.id === ready.components[`${type}Id`])]));
  const expectedTotal = Number(Object.values(selected).reduce((sum, part) => sum + part.price, 0).toFixed(2));
  await page.goto('/build');
  const next = page.getByRole('button', { name: 'Avançar', exact: true });
  await expect(next).toBeDisabled();
  for (const [index, type] of types.entries()) {
    await expect(page.locator('#wizard-step-heading')).toHaveText(labels[index]);
    await page.getByRole('button', { name: `Selecionar: ${selected[type].name}`, exact: true }).click();
    await expect(next).toBeInViewport();
    await next.click();
    await expect(page.locator('#wizard-step-heading')).toBeFocused();
    const position = await page.evaluate(() => ({ heading: document.querySelector('#wizard-step-heading').getBoundingClientRect().top, actions: document.querySelector('.wizard-actions').getBoundingClientRect().bottom }));
    expect(position.heading).toBeGreaterThan(position.actions);
  }
  await page.getByRole('spinbutton', { name: 'Orçamento', exact: true }).fill('6000');
  await next.click();
  await page.getByRole('button', { name: 'Analisar build', exact: true }).click();
  await expect(page.getByText('Build analisada com sucesso.', { exact: false })).toBeVisible();
  expect((await state(page)).compatibility.compatible).toBe(true);
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Orçamento', exact: true }).fill('5500');
  expect((await state(page)).compatibility).toBeNull();
  await next.click();
  await page.getByRole('button', { name: 'Analisar build', exact: true }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '9');
  const analyzed = await state(page);
  expect(analyzed.budget.amount).toBe(5500);
  expect(analyzed.selectedComponents).toEqual({ ...selected, fans: [] });
  expect(analyzed.bottlenecks.status).toBe('success');
  expect(analyzed.bottlenecks.data.performanceSummary.cpuScore).toBeGreaterThan(0);
  await capture(page, testInfo, 'wizard-review', page.getByRole('heading', { name: 'Análise de gargalos', exact: true }));
  let saved;
  try {
    saved = await action(page, '/saved-builds', () => page.getByRole('button', { name: 'Salvar build', exact: true }).click());
    expect(saved.components).toEqual(Object.fromEntries(types.map(type => [type, selected[type].id])));
    expect(saved.totalEstimatedPrice).toBe(expectedTotal);
    await expect(page.getByText('Build salva com sucesso.', { exact: true })).toBeVisible();
    await navigation(page, 'builds', '/saved-builds');
    await page.getByRole('article').filter({ has: page.getByRole('heading', { name: saved.name, exact: true }) }).getByRole('button', { name: 'Abrir montagem', exact: true }).click();
    await expect(page).toHaveURL(/\/build$/);
    expect((await state(page)).selectedComponents).toEqual({ ...selected, fans: [] });
    expect((await state(page)).budget.amount).toBe(5500);
    await navigation(page, 'analyze', '/compare');
    await page.getByRole('article').filter({ has: page.getByRole('heading', { name: saved.name, exact: true }) }).getByRole('button', { name: 'Selecionar', exact: true }).click();
    const compared = await action(page, '/build-comparison', () => page.getByRole('button', { name: 'Comparar selecionadas', exact: true }).click());
    expect(compared.builds).toHaveLength(2);
    for (const item of compared.builds) {
      expect(item.compatible).toBe(true);
      expect(item.totalEstimatedPrice).toBe(expectedTotal);
      await expect(page.getByRole('row').filter({ hasText: item.name })).toContainText(currency(expectedTotal));
    }
    await navigation(page, 'builds', '/summary');
    const result = await action(page, '/build-summary', () => page.getByRole('button', { name: 'Gerar resumo final', exact: true }).click());
    expect(result.totalEstimatedPrice).toBe(expectedTotal);
    expect(result.budgetStatus.remaining).toBe(Number((5500 - expectedTotal).toFixed(2)));
    expect(result.compatibility.compatible).toBe(true);
    await expect(page.getByRole('region', { name: 'Resultado da simulação individual' })).toContainText(`${result.gamePerformance.estimatedFps.toLocaleString('pt-BR')} FPS`);
    await expect(page.getByRole('link', { name: 'Pesquisar na loja', exact: true }).first()).toBeVisible();
    const shopLinks = await page.getByRole('link', { name: 'Pesquisar na loja', exact: true }).evaluateAll(links => links.map(link => ({ href: link.href, rel: link.rel, target: link.target })));
    expect(shopLinks.length).toBeGreaterThanOrEqual(7);
    for (const link of shopLinks) {
      expect(new URL(link.href).protocol).toBe('https:');
      expect(link.target).toBe('_blank');
      expect(link.rel).toContain('noopener');
    }
    await capture(page, testInfo, 'summary-game', page.getByRole('region', { name: 'Resultado da simulação individual' }));
    const score = await action(page, '/build-score', () => page.getByRole('button', { name: 'Calcular nota da build', exact: true }).click());
    const compatibility = page.locator('.criterion-card').filter({ hasText: 'Compatibilidade' });
    await expect(compatibility.locator('strong')).toHaveText(String(score.criteria.compatibilityScore));
    const scoreLines = await page.locator('.criterion-card strong').evaluateAll(values => values.map(value => {
      const range = document.createRange();
      range.selectNodeContents(value);
      return range.getClientRects().length;
    }));
    expect(scoreLines).toEqual([1, 1, 1, 1, 1]);
    await capture(page, testInfo, 'summary-score', page.getByRole('heading', { name: 'Nota geral', exact: true }));
  } finally {
    if (saved?.id) expect((await request.delete(`/api/v1/saved-builds/${saved.id}`)).ok()).toBe(true);
  }
});

test('incompatibilidade bloqueia o assistente, a correção preserva as peças e a recomendação respeita orçamento', async ({ page, request }, testInfo) => {
  const original = await applyReady(page);
  const catalog = await api(request, '/components');
  const intel = catalog.find(part => part.id === 'cpu-intel-i5-12400f');
  await page.getByRole('link', { name: 'Voltar e editar', exact: true }).click();
  await step(page, 'Processador');
  await page.getByRole('button', { name: `Selecionar: ${intel.name}`, exact: true }).click();
  await step(page, 'Revisão');
  await page.getByRole('button', { name: 'Analisar build', exact: true }).click();
  await expect(page.getByText(/Há peças incompatíveis/)).toBeVisible();
  const incompatible = await state(page);
  expect(incompatible.compatibility.compatible).toBe(false);
  expect(incompatible.bottlenecks.reason).toBe('incompatible_build');
  await capture(page, testInfo, 'incompatible', page.getByRole('heading', { name: 'Atenção: incompatibilidades encontradas', exact: true }));
  await page.getByRole('button', { name: 'Alterar Processador', exact: true }).click();
  await page.getByRole('button', { name: `Selecionar: ${original.selectedComponents.cpu.name}`, exact: true }).click();
  expect((await state(page)).selectedComponents).toEqual(original.selectedComponents);
  await step(page, 'Revisão');
  const recommendation = await action(page, '/recommendations/budget', () => page.getByRole('button', { name: 'Gerar recomendação', exact: true }).click());
  expect(recommendation.totalEstimatedPrice).toBeLessThanOrEqual(original.budget.amount);
  expect(Object.keys(recommendation.components).sort()).toEqual([...types].sort());
  await page.getByRole('button', { name: 'Usar recomendação inteira', exact: true }).click();
  expect((await state(page)).selectedComponents).toEqual({ ...recommendation.components, fans: recommendation.components.fans || [] });
  await page.getByRole('button', { name: 'Analisar build', exact: true }).click();
  await expect(page.getByText('Build analisada com sucesso.', { exact: false })).toBeVisible();
  expect((await state(page)).compatibility.compatible).toBe(true);
});

test('simulação individual, comparação de jogos, substituição e upgrades com resultados reais da API', async ({ page }, testInfo) => {
  const original = await applyReady(page);
  await page.getByRole('button', { name: 'Alterar Memória RAM', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Substituir Memória RAM', exact: true });
  await dialog.getByRole('radio', { name: /Kingston ValueRAM 32GB \(1x32GB\) DDR4-3200 CL22/ }).check();
  const preview = await action(page, '/build-summary', () => dialog.getByRole('button', { name: 'Verificar substituição', exact: true }).click());
  expect(preview.compatibility.compatible).toBe(true);
  await dialog.getByRole('button', { name: 'Aplicar substituição', exact: true }).click();
  const replaced = await state(page);
  expect(replaced.selectedComponents.ram.id).toBe('ram-kvr32n22d8-32');
  for (const type of types.filter(type => type !== 'ram')) expect(replaced.selectedComponents[type]).toEqual(original.selectedComponents[type]);
  await navigation(page, 'analyze', '/performance-lab');
  const first = await action(page, '/performance/simulate-game', () => page.getByRole('button', { name: 'Simular jogo', exact: true }).click());
  expect(first.estimatedFps).toBeGreaterThan(0);
  await expect(page.getByRole('region', { name: 'Resultado da simulação individual' })).toContainText(`${first.estimatedFps.toLocaleString('pt-BR')} FPS`);
  await page.getByRole('combobox', { name: 'Resolução', exact: true }).selectOption('4k');
  await expect(page.getByRole('region', { name: 'Resultado da simulação individual' })).toHaveCount(0);
  const second = await action(page, '/performance/simulate-game', () => page.getByRole('button', { name: 'Simular jogo', exact: true }).click());
  expect(second.estimatedFps).toBeLessThan(first.estimatedFps);
  await page.getByRole('radio', { name: /^Comparar jogos/ }).check();
  const compared = await action(page, '/performance/compare-games', () => page.getByRole('button', { name: 'Comparar jogos', exact: true }).click());
  expect(compared.results).toHaveLength(2);
  const comparison = page.getByRole('region', { name: 'Resultado da comparação de jogos' });
  await comparison.locator('summary').filter({ hasText: 'Ver resultados e requisitos por jogo' }).click();
  for (const game of compared.results) {
    const row = comparison.getByRole('row').filter({ hasText: game.gameName });
    await expect(row).toContainText(game.estimatedFps.toLocaleString('pt-BR'));
  }
  await capture(page, testInfo, 'games-comparison', comparison);
  const software = await action(page, '/performance/simulate-software', () => page.getByRole('button', { name: 'Simular software', exact: true }).click());
  expect(software.performanceScore).toBeGreaterThan(0);
  await expect(page.getByRole('region', { name: 'Resultado da simulação profissional' })).toContainText(software.software);
  await navigation(page, 'analyze', '/upgrades');
  const upgrades = await action(page, '/upgrades/suggest', () => page.getByRole('button', { name: 'Gerar sugestões', exact: true }).click());
  expect(upgrades.suggestions.length).toBeGreaterThan(0);
  for (const suggestion of upgrades.suggestions) {
    expect(suggestion.estimatedUpgradeCost).toBeLessThanOrEqual(1500);
    expect(suggestion.compatibilityStatus).toBe('compatible');
    expect(suggestion.suggestedComponent.id).not.toBe(suggestion.currentComponent.id);
    await expect(page.locator('.upgrade-card').filter({ hasText: suggestion.suggestedComponent.name })).toBeVisible();
  }
  await capture(page, testInfo, 'upgrades', page.locator('.upgrade-card').first());
});

test('catálogo, imagens, comparação de peças e navegação pública', async ({ page, request }, testInfo) => {
  const catalog = await api(request, '/components');
  await page.goto('/components');
  await page.getByRole('combobox', { name: 'Categoria', exact: true }).selectOption('storage');
  await page.getByRole('combobox', { name: 'Marca', exact: true }).selectOption('Kingston');
  await page.getByRole('spinbutton', { name: 'Preço máximo estimado (R$)', exact: true }).fill('700');
  const expected = catalog.filter(part => part.category === 'storage' && part.brand === 'Kingston' && part.price <= 700);
  await expect(page.locator('.component-card')).toHaveCount(expected.length);
  for (const part of expected) await expect(page.locator('.component-card').filter({ has: page.getByRole('heading', { name: part.name, exact: true }) })).toContainText(currency(part.price));
  expect(expected.length).toBeGreaterThanOrEqual(2);
  const photoPart = expected.find(part => part.id === 'ssd-kingston-kc3000-512gb');
  expect(photoPart?.image.status).toBe('verified');
  const photo = page.getByRole('img', { name: photoPart.image.alt, exact: true });
  await photo.scrollIntoViewIfNeeded();
  await expect.poll(() => photo.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await capture(page, testInfo, 'catalog-photo', photo);
  for (const part of expected.slice(0, 2)) await page.getByRole('button', { name: `Comparar: ${part.name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Comparar peças (2)', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Leitura (até)');
  await expect(page.getByRole('dialog')).toContainText('Preço de referência');
  await capture(page, testInfo, 'catalog-comparison');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Comparar peças (2)', exact: true })).toBeFocused();
  await expect(page.locator('header a[href="/admin"]')).toHaveCount(0);
  for (const [group, href] of [['explore', '/insights'], ['explore', '/ready-builds'], ['builds', '/saved-builds'], ['analyze', '/compare'], ['analyze', '/performance-lab'], ['analyze', '/upgrades']]) await navigation(page, group, href);
});

test('acesso administrativo direto, senha inválida, sessão protegida e logout', async ({ page, request }, testInfo) => {
  expect((await request.get('/api/v1/performance-parameters')).status()).toBe(401);
  expect((await request.get('/api/v1/admin/components')).status()).toBe(401);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Área Administrativa', exact: true })).toBeVisible();
  await capture(page, testInfo, 'admin-login');
  await page.getByLabel('Senha de acesso').fill('invalid-test-input');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Senha inválida.', { exact: true })).toBeVisible();
  await page.getByLabel('Senha de acesso').fill(process.env.PCPOWERLAB_QA_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Administração técnica', exact: true })).toBeVisible();
  await expect(page.locator('.admin-row').filter({ hasText: 'cpu-ryzen-5-5600' })).toBeVisible();
  const session = await api(page.request, '/admin/session');
  expect(session.authenticated).toBe(true);
  const cookie = (await page.context().cookies()).find(cookie => cookie.name === 'pcpowerlab_admin');
  // Never include the token in assertions, output, screenshots or traces.
  expect(Boolean(cookie?.httpOnly && cookie?.secure && cookie?.sameSite === 'Strict')).toBe(true);
  expect(await page.evaluate(() => document.cookie.includes('pcpowerlab_admin'))).toBe(false);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Administração técnica', exact: true })).toBeVisible();
  await capture(page, testInfo, 'admin-authenticated');
  let createdRule;
  try {
    await page.getByLabel('Nome', { exact: true }).fill('QA regra temporária');
    await page.getByRole('combobox', { name: 'Destino', exact: true }).selectOption('motherboard');
    await page.getByLabel('Campo', { exact: true }).fill('socket');
    await page.getByLabel('Campo destino', { exact: true }).fill('socket');
    await page.getByLabel('Mensagem', { exact: true }).fill('Confira os sockets.');
    createdRule = await action(page, '/compatibility-rules', () => page.getByRole('button', { name: 'Cadastrar regra', exact: true }).click());
    await expect(page.getByText('Regra cadastrada.', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('');
    await expect(page.locator('.admin-row').filter({ hasText: 'QA regra temporária' })).toBeVisible();
  } finally {
    if (createdRule?.id) expect((await page.request.delete(`/api/v1/compatibility-rules/${createdRule.id}`)).ok()).toBe(true);
  }
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByLabel('Senha de acesso')).toBeVisible();
  expect((await page.request.get('/api/v1/performance-parameters')).status()).toBe(401);
  expect((await api(page.request, '/admin/session')).authenticated).toBe(false);
});

test('storage legado parcial e nulo reabre wizard sem perder peças com catálogo real', async ({ page, request }) => {
  const catalog = await api(request, '/components');
  const cpu = catalog.find(part => part.category === 'cpu');
  await page.addInitScript(({ key, cpuId }) => {
    localStorage.setItem(key, JSON.stringify({
      selectedComponents: { cpuId, fans: [null, { id: 'invalid', quantity: -1 }] },
      budget: null,
      game: { qualityPreset: 'medium' },
      compatibility: { compatible: true },
      wizardStep: 'cpu'
    }));
  }, { key, cpuId: cpu.id });
  await page.goto('/build');
  await expect(page.locator('#wizard-step-heading')).toHaveText('Processador');
  await expect(page.getByRole('button', { name: 'Avançar', exact: true })).toBeEnabled();
  await expect.poll(async () => (await state(page)).selectedComponents.cpu.id).toBe(cpu.id);
  const restored = await state(page);
  expect(restored.budget).toEqual({ amount: '', currency: 'BRL', priority: 'cost-benefit' });
  expect(restored.game.targetResolution).toBe('1080p');
  expect(restored.game.qualityPreset).toBe('medium');
  expect(restored.selectedComponents.fans).toEqual([]);
  expect(restored.compatibility).toBeNull();
});
