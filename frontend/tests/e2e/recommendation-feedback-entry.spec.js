// Browser regression specifications. Collection alone does not verify these flows.
import { test, expect } from '@playwright/test';
import { listComponents } from '../../../src/services/component.service.js';
import { readyBuilds } from '../../../src/data/readyBuilds.js';

async function setup(page, profiles = []) {
  const records = [];
  await page.route('**/api/v1/**', route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    let data = [];
    if (path === '/components') data = listComponents();
    if (path === '/ready-builds') data = readyBuilds;
    if (path === '/usage-profiles') data = profiles;
    if (path === '/recommendation-feedback') {
      if (request.method() === 'POST') {
        const record = { id: `feedback-${records.length + 1}`, ...request.postDataJSON() };
        records.push(record);
        data = record;
      } else data = records;
    }
    return route.fulfill({ json: { success: true, data } });
  });
}

test('ready-build tasks are exclusive and keyboard navigation preserves draft criteria', async ({ page }) => {
  await setup(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/ready-builds');
    await expect(page.locator('.ready-build-card')).toHaveCount(readyBuilds.length);
    const tabs = page.getByRole('tablist', { name: 'Builds prontas', exact: true });
    const recommend = tabs.getByRole('tab', { name: 'Recomendar', exact: true });
    const explore = tabs.getByRole('tab', { name: 'Explorar', exact: true });
    const profiles = tabs.getByRole('tab', { name: 'Meus perfis', exact: true });
    await expect(recommend).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    await expect(page.locator('#budget-recommendation')).toBeVisible();
    await expect(page.locator('#ready-build-catalog')).toBeHidden();
    await page.getByLabel('Orçamento mínimo', { exact: true }).fill('1450');
    await recommend.focus();
    await recommend.press('ArrowRight');
    await expect(explore).toBeFocused();
    await expect(explore).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#ready-build-catalog')).toBeVisible();
    await expect(page.locator('#budget-recommendation')).toBeHidden();
    await explore.press('End');
    await expect(profiles).toBeFocused();
    await expect(page.locator('#ready-build-profiles')).toBeVisible();
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    await profiles.press('Home');
    await expect(recommend).toBeFocused();
    await expect(page.getByLabel('Orçamento mínimo', { exact: true })).toHaveValue('1450');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('legacy ready-build deep links select the requested task', async ({ page }) => {
  await setup(page);
  for (const [hash, label] of [['ready-build-catalog', 'Explorar'], ['ready-build-profiles', 'Meus perfis'], ['budget-recommendation', 'Recomendar']]) {
    await page.goto(`/ready-builds#${hash}`);
    await page.reload();
    await expect(page.getByRole('tab', { name: label, exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator(`#${hash}`)).toBeVisible();
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
  }
});

test('same-route fragments and Back/Forward reveal the requested task and retain the draft', async ({ page }) => {
  await setup(page);
  await page.goto('/ready-builds');
  await page.getByLabel('Orçamento mínimo', { exact: true }).fill('1800');
  await page.evaluate(() => { window.location.hash = 'ready-build-catalog'; });
  await expect(page.getByRole('tab', { name: 'Explorar', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#ready-build-catalog')).toBeVisible();
  await page.evaluate(() => { window.location.hash = 'ready-build-profiles'; });
  await expect(page.getByRole('tab', { name: 'Meus perfis', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#ready-build-profiles')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#ready-build-catalog')).toBeVisible();
  await page.goForward();
  await expect(page.locator('#ready-build-profiles')).toBeVisible();
  await page.getByRole('tab', { name: 'Recomendar', exact: true }).click();
  await expect(page.getByLabel('Orçamento mínimo', { exact: true })).toHaveValue('1800');
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
});

test('applying a saved profile reveals and focuses recommendation without losing budget', async ({ page }) => {
  const profile = { id: 'profile-programming', name: 'Programação', weights: { cpu: 40, gpu: 10, ram: 25, storage: 15, costBenefit: 10 } };
  await setup(page, [profile]);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/ready-builds');
  await page.getByLabel('Orçamento mínimo', { exact: true }).fill('1800');
  await page.getByRole('tab', { name: 'Meus perfis', exact: true }).click();
  await page.getByRole('button', { name: 'Aplicar na recomendação', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Recomendar', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#budget-recommendation')).toBeFocused();
  await expect(page.getByLabel('Perfil personalizado', { exact: true })).toHaveValue(profile.id);
  await expect(page.getByLabel('Tipo de uso', { exact: true })).toHaveValue('programming');
  await expect(page.getByLabel('Orçamento mínimo', { exact: true })).toHaveValue('1800');
  await expect.poll(async () => {
    const target = await page.locator('#budget-recommendation').boundingBox();
    const header = await page.locator('.topbar').boundingBox();
    return target.y >= header.y + header.height;
  }).toBe(true);
});

test('general feedback asks about project experience and sends no recommendation intent', async ({ page }) => {
  await setup(page);
  await page.goto('/feedback');
  await page.getByRole('link', { name: 'Registrar feedback geral', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Feedback geral', level: 1 })).toBeVisible();
  await expect(page.getByLabel('Você seguiria esta recomendação?')).toHaveCount(0);
  await expect(page.getByLabel('Tipo de recomendação')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Continuar com esta recomendação' })).toHaveCount(0);
  await page.getByLabel('Nota', { exact: true }).fill('4');
  await page.getByLabel('Comentário opcional').fill('As telas estão claras');
  const sent = page.waitForRequest(request => request.url().includes('/recommendation-feedback') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Enviar feedback', exact: true }).click();
  expect((await sent).postDataJSON()).toEqual({ recommendationType: 'general', rating: 4, comment: 'As telas estão claras' });
  await expect(page).toHaveURL(/\/feedback$/);
  await expect(page.locator('.feedback-list-item')).toContainText('Experiência com o projeto');
});

test('feedback opened from a ready build keeps its recommendation context and follow question', async ({ page }) => {
  await setup(page);
  await page.goto('/ready-builds');
  await page.getByRole('tab', { name: 'Explorar', exact: true }).click();
  await page.locator('.ready-build-card').first().getByRole('button', { name: 'Avaliar build', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Feedback da recomendação', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Continuar com esta recomendação' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Usar build inteira e ir para resumo', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Usar esta build inteira', exact: true })).toBeHidden();
  await page.locator('summary').filter({ hasText: 'Outras ações' }).click();
  await expect(page.getByRole('button', { name: 'Usar esta build inteira', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar build', exact: true })).toBeVisible();
  await expect(page.getByText('Usar aplica a configuração inteira avaliada, incluindo refrigeração.', { exact: false })).toBeVisible();
  await expect(page.locator('.feedback-summary-card .build-parts-list')).toBeHidden();
  await page.locator('summary').filter({ hasText: 'Ver peças da recomendação' }).click();
  await expect(page.locator('.feedback-summary-card .build-parts-list')).toBeVisible();
  await page.getByLabel('Você seguiria esta recomendação?').selectOption('false');
  const sent = page.waitForRequest(request => request.url().includes('/recommendation-feedback') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Enviar feedback', exact: true }).click();
  const payload = (await sent).postDataJSON();
  expect(payload.recommendationType).toBe('ready-build');
  expect(payload.recommendationId).toBe(readyBuilds[0].id);
  expect(payload.wouldFollowRecommendation).toBe(false);
  expect(payload.buildSnapshot.cpuId).toBe(readyBuilds[0].components.cpuId);
  await expect(page).toHaveURL(/\/feedback$/);
});
