// Reproducible server-render smoke checks. No browser is launched.
// Run from any directory: node frontend/scripts/check-catalog-render.mjs
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const componentFile = resolve(frontend, '../src/data/components.mock.js');
const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-catalog-ssr-'));
const output = join(temporary, 'render.mjs');
try {
  await build({
    stdin: {
      resolveDir: frontend,
      loader: 'jsx',
      contents: `
        import React from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';
        import { strict as assert } from 'node:assert';
        import ComponentCard from './src/components/componentsCatalog/ComponentCard.jsx';
        import { validateCatalogResponse } from './src/utils/catalogResponse.js';
        import ComponentFilters from './src/components/componentsCatalog/ComponentFilters.jsx';
        import ComponentComparison from './src/components/componentsCatalog/ComponentComparison.jsx';
        import { ComponentsProvider } from './src/hooks/useComponents.js';
        import { emptyCatalogFilters, catalogFilterFields } from './src/utils/componentPresentation.js';
        import { components } from ${JSON.stringify(componentFile)};

        const bad = { id: 'bad-cpu', category: 'cpu', name: { injected: true } };
        const renderCard = component => renderToStaticMarkup(React.createElement(ComponentsProvider, null, React.createElement(ComponentCard, { component })));
        assert.throws(() => renderCard(bad), /Objects are not valid as a React child/);
        assert.throws(() => validateCatalogResponse([bad]), /Resposta inválida/);
        const unknown = validateCatalogResponse([{ id: 'unknown', category: 'cpu', price: 'bad' }])[0];
        const unknownHtml = renderCard(unknown);
        assert(unknownHtml.includes('Componente sem nome'));
        assert(unknownHtml.includes('Preço indisponível'));
        validateCatalogResponse(components);
        console.log('PASS: malformed object display fields are rejected before real card rendering; missing names/prices retain unavailable labels; actual catalog satisfies boundary');

        for (const category of Object.keys(catalogFilterFields)) {
          const html = renderToStaticMarkup(React.createElement(ComponentFilters, {
            components, filters: { ...emptyCatalogFilters, category }, onChange: () => {}, hasBuild: true
          }));
          assert(html.includes('Buscar componente') && html.includes('Preço máximo (R$)'), category + ': essential search and budget');
          assert(!html.includes('>Compatibilidade<') && !html.includes('Preço mínimo (R$)') && !html.includes('Desempenho mínimo'), category + ': redundant controls removed');
          assert(html.includes('Ordenar por'), category + ': missing sort selector');
        }
        console.log('PASS: server rendering preserves search, maximum price and progressive sorting without redundant filters');
        const allNodes = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(child => allNodes(child, predicate)) : [...(predicate(node) ? [node] : []), ...allNodes(node.props?.children, predicate)];
        let filters = { ...emptyCatalogFilters, category: 'cpu', search: 'Ryzen', maxPrice: '1500', brand: 'AMD', specs: { socket: 'AM4' }, sort: 'price-asc' };
        const filterTree = () => {
          let captured;
          function CaptureFilters() { captured = ComponentFilters({ components, filters, onChange: next => { filters = next; } }); return captured; }
          renderToStaticMarkup(React.createElement(CaptureFilters)); return captured;
        };
        const chipButtons = node => allNodes(node, child => child.type === 'button');
        const clickChip = (node, label) => chipButtons(node).find(child => child.props['aria-label'] === label).props.onClick({ detail: 1 });
        let tree = filterTree();
        const primary = allNodes(tree, node => node.props?.className?.includes('catalog-essential-filters'))[0];
        const primaryLabels = allNodes(primary, node => Boolean(node.props?.label)).map(node => node.props.label);
        assert.deepEqual(primaryLabels.slice(0, 3), ['Buscar componente', 'Categoria', 'Preço máximo (R$)']);
        assert(primaryLabels.length <= 4, 'At most one category-specific essential filter');
        const advanced = allNodes(tree, node => node.type === 'details')[0];
        assert.equal(advanced.props.open, undefined, 'Advanced fields start natively collapsed');
        assert.equal(advanced.props.children[0].type, 'summary');
        const advancedLabels = allNodes(advanced, node => Boolean(node.props?.label)).map(node => node.props.label);
        assert(advancedLabels.includes('Ordenar por') && advancedLabels.includes('Exibição das peças'));
        assert(!advancedLabels.includes('Compatibilidade') && !advancedLabels.includes('Desempenho mínimo'));
        assert.equal(allNodes(advanced, node => node.props?.['aria-label'] === 'Filtros aplicados').length, 0);
        let chips = allNodes(tree, node => node.props?.['aria-label'] === 'Filtros aplicados')[0];
        assert.equal(chipButtons(chips).length, 5);
        clickChip(chips, 'Remover filtro Encaixe (socket): AM4');
        assert.equal(filters.specs.socket, ''); assert.equal(filters.brand, 'AMD'); assert.equal(filters.search, 'Ryzen');
        tree = filterTree(); chips = allNodes(tree, node => node.props?.['aria-label'] === 'Filtros aplicados')[0];
        assert.equal(chipButtons(chips).length, 4);
        clickChip(chips, 'Remover filtro AMD'); assert.equal(filters.brand, 'all');
        tree = filterTree(); allNodes(tree, node => node.props?.label === 'Categoria')[0].props.onChange({ target: { value: 'ram' } });
        assert.deepEqual(filters.specs, {}); assert.equal(filters.sort, 'name-asc');
        assert.equal(filters.search, 'Ryzen'); assert.equal(filters.maxPrice, '1500');
        tree = filterTree(); chips = allNodes(tree, node => node.props?.['aria-label'] === 'Filtros aplicados')[0];
        clickChip(chips, 'Remover filtro Busca: Ryzen'); assert.equal(filters.search, ''); assert.equal(filters.category, 'ram');
        tree = filterTree(); chips = allNodes(tree, node => node.props?.['aria-label'] === 'Filtros aplicados')[0];
        const priceChip = chipButtons(chips).find(node => node.props['aria-label'].startsWith('Remover filtro Até '));
        priceChip.props.onClick({ detail: 1 }); assert.equal(filters.maxPrice, ''); assert.equal(filters.category, 'ram');
        console.log('PASS: compact primary controls, collapsed secondary controls, independent filter chips and category cleanup');



        const cpu = components.find(component => component.category === 'cpu');
        const compared = [cpu, { ...cpu, id: 'ssr-unknown', name: 'Unknown CPU', specs: { ...cpu.specs, cores: null } }];
        const html = renderToStaticMarkup(React.createElement(ComponentsProvider, null,
          React.createElement(ComponentComparison, { components: compared })));
        assert(html.includes('comparison-difference'), 'missing differing-row highlight');
        assert(html.includes('Diferença'), 'missing textual difference marker');
        assert(html.includes('Não informado'), 'missing unknown-value presentation');
        assert(html.includes('role="region"') && html.includes('tabindex="0"'), 'comparison region must be keyboard-focusable');
        assert(html.includes('Tabela de comparação de peças'), 'missing accessible table-region name');
        console.log('PASS: comparison server rendering includes unknown values, differences and focusable named table region');

        const mixed = renderToStaticMarkup(React.createElement(ComponentComparison, {
          components: [cpu, components.find(component => component.category === 'ram')]
        }));
        assert(mixed.includes('role="alert"') && mixed.includes('Compare somente peças da mesma categoria.'), 'mixed categories must be rejected');
        console.log('PASS: mixed-category comparison renders its rejection message');
        console.log('LIMITATION: SSR does not execute effects or verify browser interactions, image loading, responsive geometry, scrolling or focus behavior');
      `
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    jsx: 'automatic',
    outfile: output,
    external: [componentFile],
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" }
  });
  await import(pathToFileURL(output).href);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
