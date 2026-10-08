// Commercial-copy regression checks using real React static rendering; no browser.
import { build } from 'esbuild';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-commercial-'));
try {
  const output = join(temporary, 'render.mjs');
  await build({
    stdin: { resolveDir: frontend, loader: 'jsx', contents: `
      export { default as React } from 'react';
      export { MemoryRouter } from 'react-router-dom';
      export { ComponentsProvider } from './src/hooks/useComponents.js';
      export { renderToStaticMarkup } from 'react-dom/server';
      export { default as PurchaseLinksList } from './src/components/build/PurchaseLinksList.jsx';
      export { default as BudgetPanel } from './src/components/build/BudgetPanel.jsx';
      export { default as DecisionMethodology } from './src/components/build/DecisionMethodology.jsx';
      export { default as RecommendationCard } from './src/components/recommendations/RecommendationCard.jsx';
      export { ReadyBuildCard, RecommendationResultCard } from './src/pages/ReadyBuilds.jsx';
    ` },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'expose-cards', setup(builder) {
      builder.onLoad({ filter: /\/pages\/ReadyBuilds\.jsx$/ }, async ({ path }) => ({
        contents: await readFile(path, 'utf8') + '\nexport { ReadyBuildCard, RecommendationResultCard };', loader: 'jsx'
      }));
    } }]
  });
  const { PurchaseLinksList, BudgetPanel, React, MemoryRouter, ComponentsProvider, renderToStaticMarkup, DecisionMethodology, RecommendationCard, ReadyBuildCard, RecommendationResultCard } = await import(pathToFileURL(output).href);
  const render = (Component, props = {}) => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(ComponentsProvider, null, React.createElement(Component, props))));
  const methodology = render(DecisionMethodology);
  for (const text of ['registros de pesquisa datados à vista (PIX)', 'estimativas demonstrativas', 'Não são ofertas ou estoque em tempo real', 'Cartão não entra no total', 'somente as peças', 'não benchmarks medidos', 'BIOS', 'Dados ausentes']) assert(methodology.includes(text), `Missing disclosure: ${text}`);
  const recommendation = render(RecommendationCard, { recommendation: { components: {}, totalEstimatedPrice: 1000 } });
  assert(recommendation.includes('Total estimado de referência'));
  assert(recommendation.includes('nem garantem a melhor compra'));
  const ready = render(ReadyBuildCard, { readyBuild: { name: 'Fixture', components: {}, estimatedTotalPrice: 1000 }, componentMap: {} });
  assert(ready.includes('Total estimado de referência'));
  assert(ready.includes('Desempenho estimado'));
  const result = render(RecommendationResultCard, { recommendation: { components: {}, totalEstimatedPrice: 1000 }, componentMap: {} });
  assert(result.includes('Total estimado de referência'));
  assert.match(result, /Desempenho estimado<\/span><strong>Não informado/i);
  const retained = render(RecommendationResultCard, { recommendation: { components: {}, totalEstimatedPrice: 1000 }, componentMap: {}, currentSelection: { cooler: { id: 'cooler' } } });
  assert(retained.includes('Total estimado base, sem a refrigeração mantida'));
  assert(retained.includes('Não verificada'));
  const research = render(PurchaseLinksList, { variant: 'single', links: [{ kind: 'research', componentId: 'fixture', storeName: 'Test', url: 'https://example.org/search?q=fixture', price: 100, currency: 'BRL', availabilityStatus: 'unknown' }] });
  assert(research.includes('Pesquisa externa, sem cotação desta loja'));
  assert(research.includes('Comparação automática indisponível'));
  assert(!research.includes('Consultado em:'));
  const offer = render(PurchaseLinksList, { variant: 'single', links: [{ kind: 'offer', componentId: 'fixture', storeName: 'Test fixture', url: 'https://example.org/product/fixture', price: 90, currency: 'BRL', availabilityStatus: 'available', queriedAt: '2026-10-08T10:00:00Z', validUntil: '2026-10-08T13:00:00Z', source: { name: 'Synthetic test source' }, marketMessage: 'Uma única loja com cotação válida; comparação entre lojas indisponível.' }] });
  for (const text of ['Cotação:', 'Consultado em:', 'Válido até:', 'Synthetic test source', 'Ver produto na loja', 'Uma única loja']) assert(offer.includes(text));
  const budget = render(BudgetPanel, { totalPrice: 500, budget: { amount: 600 }, pricing: { availableMarketQuotesTotal: 90, marketTotalComplete: false, componentsWithoutCurrentQuote: ['missing'], methodology: 'Valores nunca são misturados' } });
  assert(budget.includes('subtotal incompleto')); assert(budget.includes('Valores nunca são misturados'));
  const dated = { price: 125.75, updateStatus: 'dated_snapshot', source: 'dated_public_reference', isMarketQuote: false, store: 'KaBuM!', seller: 'DAXFY', model: 'MZ-77E500B/EU', queriedAt: '2026-10-08', productUrl: 'https://www.kabum.com.br/produto/647831/fixture', paymentCondition: 'PIX à vista', cardTotal: 139.72, installments: '10x sem juros', retrievalCrawlLabel: '5 days ago', observedAvailability: 'unknown', condition: 'unknown', shipping: 'Não verificado', taxes: 'Não discriminados' };
  const datedResearch = render(PurchaseLinksList, { variant: 'single', links: [{ kind: 'research', componentId: 'fixture', storeName: 'KaBuM!', url: 'https://www.kabum.com.br/busca/fixture', price: 125.75, currency: 'BRL', availabilityStatus: 'unknown', referencePricing: dated }] });
  for (const text of ['DAXFY', 'MZ-77E500B/EU', '2026-10-08', 'PIX à vista', '5 dias antes da consulta', 'Estoque na observação: não confirmado', 'Condição: não informada', 'Ver página exata da referência', 'Pesquisa externa, sem cotação desta loja']) assert(datedResearch.includes(text), `Missing dated disclosure: ${text}`);
  assert(!datedResearch.includes('Cotação:'));
  const mixedBudget = render(BudgetPanel, { totalPrice: 451.5, budget: { amount: 500 }, selectedComponents: { cpu: { id: 'estimated', price: 200 }, fans: [{ id: 'dated', price: 125.75, pricing: dated, quantity: 2 }] } });
  for (const text of ['2 pack(s) com referência datada', '1 com estimativa sem fonte datada validada', 'base demonstrativa', 'PIX', 'cartão', 'frete', 'Não é cotação ao vivo']) assert(mixedBudget.includes(text), `Missing mixed-budget disclosure: ${text}`);
  console.log('PASS: scope, estimate labels and missing-performance states render honestly across recommendation cards');
  console.log('LIMITATION: static rendering does not validate browser layout, focus or interaction');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
