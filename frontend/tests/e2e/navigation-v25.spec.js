import { test, expect } from '@playwright/test';
import { components } from '../../../src/data/components.mock.js';

const success = (route, data) => route.fulfill({ json: { success: true, data } });
async function openGroup(page, group) {
  const menu = page.getByRole('button', { name: 'Abrir menu', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.locator(`#nav-toggle-${group}`).click();
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/components') return success(route, components);
    if (path === '/admin/session') return route.fulfill({ json: { authenticated: false } });
    if (path.startsWith('/share/build/')) return route.fulfill({ status: 404, json: { success: false, message: 'Compartilhamento não encontrado.' } });
    return success(route, []);
  });
});

test('link da rota atual fecha o grupo e devolve foco ao título; voltar e avançar preservam a navegação', async ({ page }) => {
  await page.goto('/components');
  await openGroup(page, 'explore');
  await page.locator('header a[href="/components"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Catálogo de componentes', exact: true })).toBeFocused();
  await expect(page.locator('#nav-explore')).toBeHidden();
  await openGroup(page, 'builds');
  await page.locator('header a[href="/saved-builds"]').click();
  await expect(page.getByRole('heading', { name: 'Builds salvas', exact: true })).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Catálogo de componentes', exact: true })).toBeFocused();
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Builds salvas', exact: true })).toBeFocused();
});

test('Escape, clique externo e foco fora do cabeçalho fecham os grupos', async ({ page }) => {
  await page.goto('/');
  await openGroup(page, 'analyze');
  await page.locator('#nav-analyze a').first().focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('#nav-toggle-analyze')).toBeFocused();
  await expect(page.locator('#nav-analyze')).toBeHidden();
  await page.locator('#nav-toggle-analyze').click();
  // The compact dropdown can cover h1; use an actual outside non-link target.
  await page.locator('footer > span').click();
  await expect(page.locator('#nav-analyze')).toBeHidden();
  await openGroup(page, 'builds');
  const about = page.locator('footer').getByRole('link', { name: 'Sobre o projeto', exact: true });
  await about.focus();
  await expect(page.locator('#nav-builds')).toBeHidden();
  await expect(about).toBeFocused();
});

test('mudança entre desktop e menu compacto nunca deixa foco num controle oculto', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  for (const [desktopWidth, compactWidth] of [[1440, 390], [1041, 1040], [1440, 390]]) {
    await page.setViewportSize({ width: desktopWidth, height: 900 });
    await openGroup(page, 'explore');
    const link = page.locator('#nav-explore a').first();
    await link.focus();
    await expect(link).toBeFocused();
    await page.setViewportSize({ width: compactWidth, height: 844 });
    await expect(page.getByRole('button', { name: 'Abrir menu', exact: true })).toBeFocused();
    await expect(page.locator('#main-navigation')).toBeHidden();
    await page.setViewportSize({ width: desktopWidth, height: 900 });
    await expect(page.locator('.brand')).toBeFocused();
    await expect(page.locator('#nav-explore')).toBeHidden();
  }
});

test('mudança de breakpoint não recupera foco antigo após sair do cabeçalho', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await openGroup(page, 'explore');
  await page.locator('#nav-explore a').first().focus();
  const about = page.locator('footer').getByRole('link', { name: 'Sobre o projeto', exact: true });
  await about.focus();
  await expect(page.locator('#nav-explore')).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(about).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(about).toBeFocused();

  await openGroup(page, 'explore');
  const link = page.locator('#nav-explore a').first();
  await link.focus();
  await expect(link).toBeFocused();
  await link.evaluate(element => element.blur());
  await expect(page.locator('#nav-explore')).toBeHidden();
  await expect(page.locator('body')).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('body')).toBeFocused();
});

test('admin fica fora da navegação pública mas mantém a rota de autenticação', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header a[href="/admin"], footer a[href="/admin"]')).toHaveCount(0);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Área Administrativa' })).toBeVisible();
  await expect(page.getByLabel('Senha de acesso')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cadastrar regra' })).toHaveCount(0);
});

test('compartilhamento mantém título em erro e permite nova tentativa', async ({ page }) => {
  await page.goto('/shared/missing');
  await expect(page.getByRole('heading', { name: 'Configuração compartilhada', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Compartilhamento não encontrado');
  await page.route('**/share/build/missing', route => success(route, { name: 'Configuração recuperada', buildSummary: { totalEstimatedPrice: 4000, components: {} } }));
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Configuração recuperada', exact: true })).toBeVisible();
  await expect(page.getByText('Total estimado de referência', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
