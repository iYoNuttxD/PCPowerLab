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
        import { emptyCatalogFilters, catalogFilterFields, specLabel } from './src/utils/componentPresentation.js';
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
          for (const key of catalogFilterFields[category]) assert(html.includes(specLabel(key)), category + ': missing label ' + key);
          assert(html.includes('Compatibilidade'), category + ': missing compatibility filter');
          assert(html.includes('Ordenar por'), category + ': missing sort selector');
        }
        console.log('PASS: server rendering includes technical fields, compatibility and sorting for all 9 categories');

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
