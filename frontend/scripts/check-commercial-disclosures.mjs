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
      export { default as ReferencePriceNote } from './src/components/build/ReferencePriceNote.jsx';
      export { default as ComponentCard } from './src/components/componentsCatalog/ComponentCard.jsx';
      export { ImageCredit } from './src/pages/ImageCredits.jsx';
      export { ComponentImageCredits } from './src/components/componentsCatalog/ComponentImage.jsx';
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
  const { PurchaseLinksList, BudgetPanel, ReferencePriceNote, ComponentCard, ComponentImageCredits, ImageCredit, React, MemoryRouter, ComponentsProvider, renderToStaticMarkup, DecisionMethodology, RecommendationCard, ReadyBuildCard, RecommendationResultCard } = await import(pathToFileURL(output).href);
  const render = (Component, props = {}) => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(ComponentsProvider, null, React.createElement(Component, props))));
  const methodology = render(DecisionMethodology);
  for (const text of ['somente as peças', 'não garantem a melhor compra', 'Desempenho estimado, não medido', 'Compatibilidade pendente', 'BIOS']) assert(methodology.includes(text));
  const recommendation = render(RecommendationCard, { recommendation: { components: {}, totalEstimatedPrice: 1000 } });
  assert(recommendation.includes('Total estimado de referência'));
  assert(!recommendation.includes('Como interpretar os resultados'), 'Do not repeat global methodology in every recommendation card');
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
  assert(research.includes('Buscar este componente'));
  assert(!research.includes('Preço estimado:') && !research.includes('R$ 100'), 'Store search must not repeat catalog prices as store quotes');
  assert(!research.includes('Consultado em:'));
  const offer = render(PurchaseLinksList, { variant: 'single', links: [{ kind: 'offer', componentId: 'fixture', storeName: 'Test fixture', url: 'https://example.org/product/fixture', price: 90, currency: 'BRL', availabilityStatus: 'available', queriedAt: '2026-10-08T10:00:00Z', validUntil: '2026-10-08T13:00:00Z', source: { name: 'Synthetic test source' }, marketMessage: 'Uma única loja com cotação válida; comparação entre lojas indisponível.' }] });
  for (const text of ['Cotação:', 'Consultado em:', 'Válido até:', 'Synthetic test source', 'Ver produto na loja']) assert(offer.includes(text));
  const budget = render(BudgetPanel, { totalPrice: 500, budget: { amount: 600 }, pricing: { availableMarketQuotesTotal: 90, marketTotalComplete: false, componentsWithoutCurrentQuote: ['missing'], methodology: 'Valores nunca são misturados' } });
  assert(budget.includes('subtotal incompleto')); assert(budget.includes('Separadas do total de referência'));
  const dated = { price: 125.75, updateStatus: 'dated_snapshot', source: 'dated_public_reference', isMarketQuote: false, store: 'KaBuM!', seller: 'DAXFY', model: 'MZ-77E500B/EU', queriedAt: '2026-10-08', productUrl: 'https://www.kabum.com.br/produto/647831/fixture', paymentCondition: 'PIX à vista', cardTotal: 139.72, installments: '10x sem juros', retrievalCrawlLabel: '5 days ago', observedAvailability: 'unknown', condition: 'unknown', shipping: 'Não verificado', taxes: 'Não discriminados' };
  const datedComponent = { id: 'fixture', name: 'Fixture', category: 'storage', price: dated.price, pricing: dated };
  for (const compact of [true, false]) {
    const note = render(ReferencePriceNote, { component: datedComponent, compact });
    assert.match(note, /^<p[^>]*>/);
    assert(!note.includes('<details') && !note.includes('<summary'), 'No hidden explanatory wall');
    assert(note.includes('Referência PIX · KaBuM! · 2026-10-08'));
    assert(note.includes(dated.productUrl), 'Direct source remains accessible');
  }
  const card = render(ComponentCard, { component: datedComponent });
  assert.equal((card.match(/Referência PIX · KaBuM! · 2026-10-08/g) || []).length, 1, 'A card should display the reference label only once');
  const estimatedNote = render(ReferencePriceNote, { component: { price: 200 } });
  assert(estimatedNote.includes('Estimativa do catálogo'));
  assert(!estimatedNote.includes('<details'));
  assert(!/<details[^>]*\bopen(?:=|\s|>)/.test(estimatedNote));
  const staleNote = render(ReferencePriceNote, { component: { ...datedComponent, price: 100 } });
  assert(staleNote.includes('Estimativa do catálogo') && !staleNote.includes(dated.productUrl));
  const media = { componentId: 'fixture', status: 'verified', imageType: 'photo', imagePath: '/images/components/fixture.webp', lastVerifiedAt: '2026-10-08', imageSource: 'https://example.org/source', manufacturerProductUrl: 'https://example.org/model', author: 'Photographer', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', modifications: 'Redimensionada' };
  const credits = render(ImageCredit, { component: { id: 'fixture', name: 'Fixture', image: media } });
  for (const value of [media.imageSource, media.manufacturerProductUrl, media.licenseUrl, media.author, media.modifications]) assert(credits.includes(value), 'Dedicated credits retain required attribution');
  assert.equal(render(ComponentImageCredits, { media }), '', 'Exact photos do not repeat credits in every card');
  const familyCredits = render(ComponentImageCredits, { media: { ...media, identityLevel: 'model-family', identityNotes: 'Long notes remain in the source record.' } });
  assert(familyCredits.includes('Foto da família') && !familyCredits.includes('Long notes'));
  const representativeCredits = render(ComponentImageCredits, { media: { ...media, identityLevel: 'representative-product' } });
  assert(representativeCredits.includes('Imagem ilustrativa') && !representativeCredits.includes('<details'));
  const familyPrice = render(ReferencePriceNote, { component: { ...datedComponent, pricing: { ...dated, referenceScope: 'family', sourceVariantName: 'Commercial model' } } });
  assert(familyPrice.includes('Variante: Commercial model'));
  const benchmarkPrice = render(ReferencePriceNote, { component: { ...datedComponent, pricing: { ...dated, referenceScope: 'benchmark', sourceVariantName: 'Example model' } } });
  assert(benchmarkPrice.includes('Exemplo de preço: Example model'));
  const datedResearch = render(PurchaseLinksList, { variant: 'single', links: [{ kind: 'research', componentId: 'fixture', storeName: 'KaBuM!', url: 'https://www.kabum.com.br/busca/fixture', price: 125.75, currency: 'BRL', availabilityStatus: 'unknown', referencePricing: dated }] });
  for (const text of ['2026-10-08', 'Referência PIX', dated.productUrl, 'Buscar este componente']) assert(datedResearch.includes(text));
  assert(!datedResearch.includes('Cotação:'));
  const mixedBudget = render(BudgetPanel, { totalPrice: 451.5, budget: { amount: 500 }, selectedComponents: { cpu: { id: 'estimated', price: 200 }, fans: [{ id: 'dated', price: 125.75, pricing: dated, quantity: 2 }] } });
  for (const text of ['1 item estimado', 'sem frete e montagem']) assert(mixedBudget.includes(text));
  assert(!mixedBudget.includes('<details'));
  const missingBudget = render(BudgetPanel, { totalPrice: null, budget: { amount: 500 }, selectedComponents: { cpu: { id: 'priced', price: 123.45 }, gpu: { id: 'missing', price: null } } });
  assert(missingBudget.includes('Subtotal conhecido:') && missingBudget.includes('123,45') && missingBudget.includes('1 sem cotação'));
  assert(missingBudget.includes('Pendente') && !missingBudget.includes('>Dentro<') && !missingBudget.includes('2 itens estimados'));
  console.log('PASS: concise direct price sources; distinct variant/benchmark identities; image credits preserved in a dedicated destination');
  console.log('PASS: scope, estimate labels and missing-performance states render honestly across recommendation cards');
  console.log('LIMITATION: static rendering does not validate browser layout, focus or interaction');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
