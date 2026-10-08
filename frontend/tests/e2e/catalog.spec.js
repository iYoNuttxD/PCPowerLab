import { activePart, comparisonCpuIds } from './helpers/catalog.js';
import { test, expect } from '@playwright/test';
import { mockWizardAnalysis } from './helpers/analysis.js';
import { listComponents } from '../../../src/services/component.service.js';
import { readyBuilds } from '../../../src/data/readyBuilds.js';

const components = listComponents({ includeLegacy: true });
const activeComponents = components.filter(component => component.selectable);
const literalName = name => new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const storageKey = 'pcpowerlab-build-state';
const types = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
const original = Object.fromEntries(types.map(type => [type, components.find(component => component.id === readyBuilds[0].components[`${type}Id`])]));
original.fans = [];
const ram16 = activePart(components, 'ram-kf436c17bbk2-16');
const ram32 = activePart(components, 'ram-kvr32n22d8-32');
const ramDdr5 = activePart(components, 'ram-cmk16gx5m1b5200c40');
const photo = activePart(components, 'ssd-xpg-gammix-s70-blade-1tb');
const failures = new WeakMap();
const ok = (route, data) => route.fulfill({ json: { success: true, data } });
const fail = (route, message = 'Não foi possível consultar o catálogo.', status = 503) => route.fulfill({ status, json: { success: false, message } });
const getState = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);

function summary(payload, overrides = {}) {
  const selected = Object.fromEntries(types.map(type => [type, components.find(component => component.id === payload.build[`${type}Id`])]));
  const total = Number(Object.values(selected).reduce((sum, component) => sum + component.price, 0).toFixed(2));
  return {
    components: selected, totalEstimatedPrice: total,
    compatibility: { compatible: true, alerts: [] },
    budgetStatus: payload.budget ? { amount: payload.budget.amount, status: total > payload.budget.amount ? 'over_budget' : 'within_budget' } : undefined,
    bottlenecks: { hasBottleneck: false, bottlenecks: [], performanceSummary: {} },
    gamePerformance: { game: 'Jogo verificado', estimatedFps: 75, performanceLevel: 'good', meetsMinimumRequirements: true, meetsRecommendedRequirements: true },
    summary: 'Resumo atualizado após verificar a nova montagem.', finalRecommendation: 'Confira os dados antes da compra.', ...overrides
  };
}

async function seed(page, extra = {}) {
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key: storageKey, state: { selectedComponents: original, budget: { amount: 5000, currency: 'BRL', priority: 'cost-benefit' }, usageType: 'gaming', wizardStep: 'review', recommendation: { components: original }, compatibility: { compatible: true, alerts: [] }, summary: { summary: 'Resumo antigo', compatibility: { compatible: true, alerts: [] } }, ...extra } });
}

async function openReplacement(page) {
  await page.goto('/summary');
  await page.locator('summary').filter({ hasText: 'Ver ou trocar peças' }).click();
  await page.getByRole('button', { name: 'Alterar Memória RAM', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Substituir Memória RAM', exact: true });
  await expect(dialog.getByRole('radio').first()).toBeVisible();
  return dialog;
}

test.beforeEach(async ({ page }) => {
  const errors = [];
  failures.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/components') return ok(route, components);
    if (path === '/performance/games') return ok(route, []);
    if (path === '/build-summary') return ok(route, summary(route.request().postDataJSON()));
    if (path === '/build-score') return ok(route, { overallScore: 90, classification: 'Muito boa', criteria: {}, summary: 'Nota anterior à troca.' });
    if (path.startsWith('/purchase-links/')) return ok(route, [{ componentId: photo.id, storeName: 'Loja de teste', url: 'https://example.com/search?q=ssd', price: null, currency: 'BRL', availabilityStatus: 'unknown' }]);
    return fail(route, `Endpoint inesperado no teste: ${path}`, 500);
  });
});
test.afterEach(async ({ page }) => expect(failures.get(page)).toEqual([]));

test('combina marca, categoria, nome e limites inclusivos de preço; explica faixa inválida', async ({ page }) => {
  await page.goto('/components');
  await page.getByRole('combobox', { name: 'Categoria', exact: true }).selectOption('ram');
  await page.locator('.catalog-advanced-filters > summary').click();
  await page.getByRole('combobox', { name: 'Marca', exact: true }).selectOption('Kingston');
  await page.getByRole('spinbutton', { name: 'Preço mínimo (R$)', exact: true }).fill(String(ram16.price));
  await page.getByRole('spinbutton', { name: 'Preço máximo (R$)', exact: true }).fill(String(activePart(components, 'ram-kf436c18bb2a-16').price));
  await page.getByRole('searchbox').fill('  FuRy  ');
  await expect(page.locator('.component-card')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: ram16.name, exact: true })).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Preço mínimo (R$)', exact: true }).fill('2000');
  await expect(page.getByText('O preço mínimo deve ser menor ou igual ao máximo.', { exact: true })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Preço máximo (R$)', exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Nenhum componente encontrado', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  await expect(page.locator('.component-card')).toHaveCount(activeComponents.length);
  await page.getByRole('combobox', { name: 'Marca', exact: true }).selectOption('Intel');
  await expect(page.locator('.component-card')).toHaveCount(activeComponents.filter(component => component.brand === 'Intel').length);
  await page.getByRole('combobox', { name: 'Categoria', exact: true }).selectOption('storage');
  await expect(page.getByRole('combobox', { name: 'Marca', exact: true })).toHaveValue('all');
  await expect(page.locator('.component-card')).toHaveCount(activeComponents.filter(component => component.category === 'storage').length);
});

test('compara peças da mesma categoria, mantém seleção ao filtrar e padroniza unidades', async ({ page }) => {
  await page.goto('/components');
  await page.getByRole('combobox', { name: 'Categoria', exact: true }).selectOption('ram');
  await page.getByRole('button', { name: `Comparar: ${ram16.name}`, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Comparar peças (1)', exact: true })).toBeDisabled();
  await page.locator('.catalog-advanced-filters > summary').click();
  await page.getByRole('combobox', { name: 'Marca', exact: true }).selectOption(ram32.brand);
  await page.getByRole('button', { name: `Comparar: ${ram32.name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  await expect(page.getByRole('button', { name: `Comparar: ${original.cpu.name}`, exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Comparar peças (2)', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Comparar componentes' });
  await expect(dialog.getByRole('columnheader', { name: ram16.name, exact: true })).toBeVisible();
  const capacityRow = dialog.getByRole('rowheader', { name: /^Capacidade(?:\s*Diferença)?$/ }).locator('..');
  const columnNames = (await dialog.getByRole('columnheader').allTextContents()).slice(1).map(name => name.trim());
  const capacityByName = new Map([[ram16.name, '16 GB'], [ram32.name, '32 GB']]);
  expect(columnNames.slice().sort()).toEqual([ram16.name, ram32.name].sort());
  await expect(capacityRow.getByRole('cell')).toHaveText(columnNames.map(name => capacityByName.get(name)));
  await expect(dialog.getByRole('row').filter({ hasText: 'Taxa de transferência' })).toContainText('3.600 MT/s');
  await expect(dialog.getByRole('row').filter({ hasText: 'Modelo / código' })).toContainText(ram32.partNumber);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Comparar peças (2)', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Limpar seleção', exact: true }).click();
  await expect(page.getByRole('button', { name: `Comparar: ${original.cpu.name}`, exact: true })).toBeEnabled();
});

test('limita a comparação a quatro peças e identifica especificação ausente', async ({ page }) => {
  const cpus = comparisonCpuIds.map(id => activePart(components, id)).map((component, index) => index ? component : { ...component, specs: { socket: 'AM4' } });
  await page.route(/\/api\/v1\/components(?:\?.*)?$/, route => ok(route, cpus));
  await page.goto('/components');
  for (const component of cpus.slice(0, 4)) await page.getByRole('button', { name: `Comparar: ${component.name}`, exact: true }).click();
  await expect(page.getByRole('button', { name: `Comparar: ${cpus[4].name}`, exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Comparar peças (4)', exact: true }).click();
  const row = page.getByRole('dialog').getByRole('row').filter({ hasText: 'Núcleos' });
  await expect(row.getByRole('cell', { name: 'Não informado', exact: true })).toHaveCount(1);
});

test('fotografia com origem registrada, ausência e falha de imagem mantêm fallback e cards alinhados', async ({ page, isMobile }) => {
  const fixtures = [photo, { ...photo, id: 'broken-photo', name: 'Modelo com imagem indisponível', image: { ...photo.image, componentId: 'broken-photo', imagePath: '/images/components/inexistente.jpg' } }, { ...original.ram, image: null, name: 'Memória com nome muito longo para verificar o alinhamento de informações, preços e botões sem deformar o card' }];
  await page.route(/\/api\/v1\/components(?:\?.*)?$/, route => ok(route, fixtures));
  await page.goto('/components');
  const photoCard = page.locator('.component-card').filter({ has: page.getByRole('heading', { name: photo.name, exact: true }) });
  // The native lazy image stays hidden until it loads; scroll its visible card first.
  await photoCard.scrollIntoViewIfNeeded();
  const image = photoCard.getByRole('img', { name: photo.image.alt });
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
  await expect(photoCard.locator('.component-image-credits')).toHaveCount(0);
  await page.locator('.component-card').filter({ has: page.getByRole('heading', { name: 'Modelo com imagem indisponível', exact: true }) }).scrollIntoViewIfNeeded();
  await expect(page.getByText('Sem imagem', { exact: true })).toHaveCount(2);
  if (!isMobile) {
    const boxes = await page.locator('.component-card').evaluateAll(cards => cards.map(card => ({ top: card.getBoundingClientRect().top, height: card.getBoundingClientRect().height, price: card.querySelector('.component-card-price').getBoundingClientRect().top })));
    expect(new Set(boxes.map(box => box.height)).size).toBe(1);
    expect(new Set(boxes.map(box => box.price)).size).toBe(1);
  }
  await page.getByRole('button', { name: `Detalhes de ${photo.name}`, exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(photo.partNumber);
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Consultar especificações do fabricante' })).toHaveAttribute('href', photo.specSourceUrl);
});

test('imagem sem origem não é carregada; preços ausentes não aparecem como zero', async ({ page }) => {
  await page.route(/\/api\/v1\/components(?:\?.*)?$/, route => ok(route, [{ ...photo, price: null, image: { ...photo.image, imageSource: null } }]));
  await page.goto('/components');
  await expect(page.locator('.component-card img')).toHaveCount(0);
  await expect(page.getByText('Sem imagem', { exact: true })).toBeVisible();
  await expect(page.getByText('Preço indisponível', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Lojas para ${photo.name}`, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Confirme preço e estoque na loja.');
  await expect(dialog).not.toContainText('Preço estimado:');
  await expect(dialog.getByRole('link', { name: 'Pesquisar na loja', exact: true })).toHaveAttribute('target', '_blank');
});

test('preço tem fonte direta e créditos têm destino único, sem explicações ocultas', async ({ page }) => {
  const pricing = { ...photo.pricing, price: 125.75, updateStatus: 'dated_snapshot', source: 'dated_public_reference', isMarketQuote: false,
    referenceScope: 'exact', identityMatch: 'exact', verificationMethod: 'rendered_product_page',
    observedAvailability: 'available', availabilityEvidence: 'Test fixture: buy button enabled for this exact SKU',
    observationSource: { kind: 'manual_public_page_observation', authorizedApi: false },
    observedAt: '2026-10-08T12:00:00Z', store: 'KaBuM!', queriedAt: '2026-10-08', model: photo.partNumber,
    paymentCondition: 'PIX à vista', productUrl: 'https://www.kabum.com.br/produto/fixture' };
  await page.route(/\/api\/v1\/components(?:\?.*)?$/, route => ok(route, [{ ...photo, price: pricing.price, pricing, image: { ...photo.image, rightsBasis: null, author: null, license: null, licenseUrl: null } }]));
  await page.goto('/components');
  const card = page.locator('.component-card');
  await expect(card.locator('img')).toBeVisible();
  const priceNote = card.locator('.reference-price-note');
  await expect(priceNote).toHaveText('Referência PIX · KaBuM! · 08/10/2026, 12:00 UTC');
  await expect(priceNote.locator('details')).toHaveCount(0);
  await expect(priceNote.getByRole('link')).toHaveAttribute('href', pricing.productUrl);
  await page.getByRole('link', { name: 'Créditos das imagens', exact: true }).click();
  const credit = page.locator('.image-credit');
  await expect(credit.getByRole('link', { name: 'Origem da fotografia', exact: true })).toHaveAttribute('href', photo.image.imageSource);
  await expect(credit).not.toContainText('undefined');
});

test('referência com estoque desconhecido não exibe cotação nem link elegível', async ({ page }) => {
  const pricing = { ...photo.pricing, observedAvailability: 'unknown' };
  await page.route(/\/api\/v1\/components(?:\?.*)?$/, route => ok(route, [{ ...photo, pricing }]));
  await page.goto('/components');
  const note = page.locator('.component-card .reference-price-note');
  await expect(note).toHaveText('Sem cotação');
  await expect(note.getByRole('link')).toHaveCount(0);
});

test('catálogo diferencia carregamento, falha, vazio e recuperação', async ({ page }) => {
  let release;
  await page.route(/\/api\/v1\/components(?:\?.*)?$/, async route => { await new Promise(resolve => { release = resolve; }); await fail(route); });
  await page.goto('/components');
  await expect(page.getByText('Carregando dados do laboratório...', { exact: true })).toBeVisible();
  await expect.poll(() => Boolean(release)).toBe(true); release();
  await expect(page.getByRole('alert')).toContainText('Não foi possível consultar o catálogo.');
  await page.route(/\/api\/v1\/components(?:\?.*)?$/, route => ok(route, []));
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByText('Nenhum componente encontrado', { exact: true })).toBeVisible();
  await page.route(/\/api\/v1\/components(?:\?.*)?$/, route => ok(route, components));
  await page.reload();
  await expect(page.locator('.component-card')).toHaveCount(activeComponents.length);
});

test('substitui uma peça recomendada no resumo após verificar e preserva a montagem', async ({ page }) => {
  await seed(page);
  await page.goto('/summary');
  await page.locator('summary').filter({ hasText: 'Pontuação da configuração' }).click();
  await page.getByRole('button', { name: 'Calcular nota da build', exact: true }).click();
  await expect(page.getByText('Nota anterior à troca.', { exact: true })).toBeVisible();
  await page.locator('summary').filter({ hasText: 'Ver ou trocar peças' }).click();
  await page.getByRole('button', { name: 'Alterar Memória RAM', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Substituir Memória RAM' });
  await dialog.getByRole('radio', { name: literalName(ram32.name) }).check();
  await expect(dialog.getByRole('button', { name: 'Aplicar substituição' })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Verificar substituição' })).toBeInViewport();
  const request = page.waitForRequest(request => request.url().endsWith('/build-summary'));
  await dialog.getByRole('button', { name: 'Verificar substituição' }).click();
  const sent = (await request).postDataJSON();
  expect(sent.build).toEqual({ ...readyBuilds[0].components, ramId: ram32.id, fans: [] });
  expect(sent.budget).toEqual({ amount: 5000, currency: 'BRL', priority: 'cost-benefit' });
  await expect(dialog.getByRole('button', { name: 'Aplicar substituição' })).toBeEnabled();
  await expect(dialog.getByRole('region', { name: 'Verificação da substituição' })).toBeFocused();
  expect((await getState(page)).selectedComponents.ram.id).toBe(original.ram.id);
  await dialog.getByRole('button', { name: 'Aplicar substituição' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Resumo atualizado após verificar a nova montagem.', { exact: true })).toBeVisible();
  await expect(page.getByText('Nota anterior à troca.', { exact: true })).toHaveCount(0);
  const state = await getState(page);
  expect(state.selectedComponents).toEqual({ ...original, ram: ram32 });
  expect(state.budget).toEqual({ amount: 5000, currency: 'BRL', priority: 'cost-benefit' });
  expect(state.usageType).toBe('gaming'); expect(state.wizardStep).toBe('review');
  expect(state.recommendation).toBeNull(); expect(state.gamePerformance.estimatedFps).toBe(75);
  await page.reload();
  await expect(page.locator('.build-summary-card')).toContainText(ram32.name);
  expect((await getState(page)).selectedComponents).toEqual(state.selectedComponents);
  await page.getByRole('link', { name: 'Voltar e editar', exact: true }).click();
  await expect(page.locator('#wizard-step-heading')).toHaveText('Revisão');
  // Startup keeps the chosen pieces but discards untrusted cached analyses.
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '8');
  const restored = await getState(page);
  expect(restored.compatibility).toBeNull();
  expect(restored.bottlenecks).toBeNull();
  expect(restored.selectedComponents).toEqual(state.selectedComponents);
  expect(restored.budget).toEqual(state.budget);
  await mockWizardAnalysis(page);
  await page.getByRole('button', { name: 'Analisar build', exact: true }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '9');
});

test('incompatibilidade impede aplicar; fechar a prévia mantém as escolhas e análises anteriores', async ({ page }) => {
  await seed(page);
  await page.route('**/build-summary', route => ok(route, summary(route.request().postDataJSON(), { compatibility: { compatible: false, alerts: [{ message: 'A memória DDR5 não corresponde à placa-mãe DDR4.', severity: 'high' }] } })));
  const dialog = await openReplacement(page);
  const before = await getState(page);
  await dialog.getByRole('radio', { name: literalName(ramDdr5.name) }).check();
  await dialog.getByRole('button', { name: 'Verificar substituição' }).click();
  await expect(dialog.getByText('A memória DDR5 não corresponde à placa-mãe DDR4.', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Aplicar substituição' })).toBeDisabled();
  await page.keyboard.press('Escape');
  expect(await getState(page)).toEqual(before);
  await expect(page.getByRole('button', { name: 'Alterar Memória RAM', exact: true })).toBeFocused();
});

test('excesso de orçamento e análises indisponíveis são informados sem inventar aprovação de desempenho', async ({ page }) => {
  await seed(page, { budget: { amount: 1000, currency: 'BRL', priority: 'cost-benefit' } });
  await page.route('**/build-summary', route => ok(route, summary(route.request().postDataJSON(), { bottlenecks: { available: false, message: 'Parâmetros ausentes.' }, gamePerformance: { available: false, message: 'FPS indisponível por falta de parâmetros.' } })));
  const dialog = await openReplacement(page);
  await dialog.getByRole('radio', { name: literalName(ram32.name) }).check();
  await dialog.getByRole('button', { name: 'Verificar substituição' }).click();
  await expect(dialog.getByText(/O novo total excede o orçamento/)).toBeVisible();
  await expect(dialog.getByText(/Parte das análises de desempenho está indisponível/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Aplicar substituição' }).click();
  await expect(page.getByText('FPS indisponível por falta de parâmetros.', { exact: true })).toBeVisible();
  expect((await getState(page)).budget.amount).toBe(1000);
});

test('falha de API e resposta atrasada não alteram a montagem nem aprovam outra peça', async ({ page }) => {
  await seed(page);
  await page.route('**/build-summary', route => fail(route, 'Dados insuficientes para verificar a substituição.', 400));
  const dialog = await openReplacement(page);
  await dialog.getByRole('radio', { name: literalName(ram16.name) }).check();
  await dialog.getByRole('button', { name: 'Verificar substituição' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Dados insuficientes');
  await expect(dialog.getByRole('button', { name: 'Aplicar substituição' })).toBeDisabled();
  let release;
  await page.route('**/build-summary', async route => { const payload = route.request().postDataJSON(); await new Promise(resolve => { release = resolve; }); await ok(route, summary(payload)); });
  await dialog.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Verificar substituição' })).toBeDisabled();
  await expect.poll(() => Boolean(release)).toBe(true);
  await dialog.getByRole('radio', { name: literalName(ram32.name) }).check(); release();
  await expect(dialog.getByRole('button', { name: 'Aplicar substituição' })).toBeDisabled();
  expect((await getState(page)).selectedComponents).toEqual(original);
  await page.route('**/build-summary', route => ok(route, summary(route.request().postDataJSON())));
  await dialog.getByRole('button', { name: 'Verificar substituição' }).click();
  await expect(dialog.getByRole('button', { name: 'Aplicar substituição' })).toBeEnabled();
});

test('montagem incompleta orienta completar as outras peças sem chamar a API de análise', async ({ page }) => {
  await seed(page, { selectedComponents: { ram: original.ram } });
  let requests = 0;
  await page.route('**/build-summary', route => { requests++; return fail(route); });
  const dialog = await openReplacement(page);
  await dialog.getByRole('radio', { name: literalName(ram32.name) }).check();
  await expect(dialog.getByText(/Complete as outras categorias/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Verificar substituição' })).toBeDisabled();
  expect(requests).toBe(0);
});

test('sugestão técnica no resumo reutiliza a mesma prévia e revalida antes de aplicar', async ({ page }) => {
  await seed(page, { selectedComponents: { ...original, ram: ramDdr5 } });
  await page.route('**/build-summary', route => {
    const payload = route.request().postDataJSON();
    const incompatible = payload.build.ramId === ramDdr5.id;
    return ok(route, summary(payload, { compatibility: { compatible: !incompatible, alerts: incompatible ? [{ message: 'Tipo de memória incompatível.', severity: 'high' }] : [] } }));
  });
  await page.route('**/compatibility/fix-suggestions', route => ok(route, { suggestions: [{ componentType: 'ram', currentComponent: ramDdr5, suggestedComponent: ram32, reason: 'Usar DDR4.' }] }));
  await page.goto('/summary');
  await page.getByRole('button', { name: 'Gerar resumo final', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Atenção: incompatibilidades encontradas', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ver correções', exact: true }).first().click();
  await page.getByRole('button', { name: 'Revisar substituição', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Substituir Memória RAM' });
  await expect(dialog.getByRole('radio', { name: literalName(ram32.name) })).toBeChecked();
  await expect(dialog.getByRole('button', { name: 'Aplicar substituição' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Verificar substituição' }).click();
  await dialog.getByRole('button', { name: 'Aplicar substituição' }).click();
  expect((await getState(page)).selectedComponents).toEqual({ ...original, ram: ram32 });
});

test('v2.4 undo after reload restores previous pieces and recalculates matching analyses', async ({ page }) => {
  await seed(page);
  const dialog = await openReplacement(page);
  await dialog.getByRole('radio', { name: literalName(ram32.name) }).check();
  await dialog.getByRole('button', { name: 'Verificar substituição' }).click();
  await dialog.getByRole('button', { name: 'Aplicar substituição' }).click();
  await page.reload();
  await expect(page.locator('.build-summary-card')).toContainText(ram32.name);
  await page.getByRole('button', { name: 'Desfazer última troca' }).click();
  await expect.poll(async () => (await getState(page)).summary?.components?.ram?.id).toBe(original.ram.id);
  const state = await getState(page);
  expect(state.selectedComponents).toEqual(original);
  expect(state.budget.amount).toBe(5000);
  expect(state.revision).toBe(2);
  expect(state.recommendation).toBeNull();
});

test('v2.4 pending technical data allow explicit single replacement without claiming compatibility', async ({ page }) => {
  await seed(page);
  await page.route('**/build-summary', route => ok(route, summary(route.request().postDataJSON(), {
    compatibility: { compatible: false, status: 'unverified', alerts: [], unverifiedChecks: [{ code: 'POWER_UNKNOWN', message: 'Consumo do cooler não informado.' }] },
    gamePerformance: { available: false, message: 'Compatibilidade não confirmada.' }
  })));
  const dialog = await openReplacement(page);
  await dialog.getByRole('radio', { name: literalName(ram32.name) }).check();
  await dialog.getByRole('button', { name: 'Verificar substituição' }).click();
  await expect(dialog.getByText('Compatibilidade não verificada', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Aplicar substituição' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Aplicar substituição' }).click();
  expect((await getState(page)).selectedComponents).toEqual({ ...original, ram: ram32 });
  expect((await getState(page)).compatibility.compatible).toBe(false);
});
