// Browser regression specifications. Collection alone does not verify these flows.
import { test, expect } from '@playwright/test';
import { listComponents } from '../../../src/services/component.service.js';
import { readyBuilds } from '../../../src/data/readyBuilds.js';

async function setup(page) {
  const records = [];
  await page.route('**/api/v1/**', route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    let data = [];
    if (path === '/components') data = listComponents();
    if (path === '/ready-builds') data = readyBuilds;
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

test('budget entry comes before the long catalog and section shortcuts move keyboard focus above the header', async ({ page }) => {
  await setup(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/ready-builds');
    await expect(page.locator('.ready-build-card')).toHaveCount(readyBuilds.length);
    const form = page.locator('#budget-recommendation');
    const catalog = page.locator('#ready-build-catalog');
    expect((await form.boundingBox()).y).toBeLessThan((await catalog.boundingBox()).y);
    expect((await form.boundingBox()).y).toBeLessThan(1800);
    const shortcuts = page.getByRole('navigation', { name: 'Seções de builds prontas' });
    for (const [label, id] of [['Explorar builds prontas', 'ready-build-catalog'], ['Gerenciar perfis', 'ready-build-profiles'], ['Recomendar por orçamento', 'budget-recommendation']]) {
      const link = shortcuts.getByRole('link', { name: label, exact: true });
      await link.focus();
      await link.press('Enter');
      await expect(page.locator(`#${id}`)).toBeFocused();
      await expect.poll(async () => {
        const target = await page.locator(`#${id}`).boundingBox();
        const header = await page.locator('.topbar').boundingBox();
        return target.y >= header.y + header.height;
      }).toBe(true);
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
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
  await page.locator('.ready-build-card').first().getByRole('button', { name: 'Avaliar build', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Feedback da recomendação', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Continuar com esta recomendação' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Usar esta build inteira', exact: true })).toBeVisible();
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
