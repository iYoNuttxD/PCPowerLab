// Static React page/landmark audit only. Does not launch a browser or validate layout.
import { build } from 'esbuild';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-page-audit-'));
try {
  const output = join(temporary, 'pages.mjs');
  await build({ stdin: { resolveDir: frontend, loader: 'jsx', contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { MemoryRouter } from 'react-router-dom';
    import App from './src/App.jsx';
    import { ComponentsProvider } from './src/hooks/useComponents.js';
    import { BuildProvider } from './src/hooks/useBuildState.jsx';
    export const render = route => renderToStaticMarkup(<MemoryRouter initialEntries={[route]}><ComponentsProvider><BuildProvider><App /></BuildProvider></ComponentsProvider></MemoryRouter>);
  ` }, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" } });
  const { render } = await import(pathToFileURL(output));
  const routes = ['/', '/components', '/build', '/summary', '/performance-lab', '/compare', '/insights', '/feedback', '/feedback/new', '/ready-builds', '/saved-builds', '/upgrades', '/shared/audit-placeholder', '/admin', '/about', '/image-credits', '/missing-route-v25'];
  for (const route of routes) {
    const html = render(route);
    assert.equal((html.match(/<main\b/g) || []).length, 1, route + ': one main landmark');
    assert(!/<a[^>]*href="\/admin"/.test(html), route + ': no public admin link');
    const headings = [...html.matchAll(/<h1\b[^>]*>(.*?)<\/h1>/g)].map(match => match[1].replace(/<[^>]+>/g, ''));
    assert.equal(headings.length, 1, route + ': stable page heading including loading states');
    assert(html.includes('Pular para o conteúdo'), route + ': skip link');
    console.log(JSON.stringify({ route, heading: headings[0], initialLoading: html.includes('loading-state'), method: 'React static server rendering', visualWidthsExecuted: [] }));
  }
  // Token pairs only. Composited gradients, disabled states, images and browser paint remain unverified.
  const theme = await readFile(join(frontend, 'src/styles/theme.css'), 'utf8');
  const tokens = Object.fromEntries([...theme.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map(match => [match[1], match[2]]));
  const luminance = hex => hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  for (const foreground of ['text', 'muted', 'cyan', 'green', 'magenta', 'yellow', 'red', 'blue']) {
    for (const background of ['bg', 'bg-elevated', 'panel', 'panel-strong']) {
      const a = luminance(tokens[foreground]), b = luminance(tokens[background]);
      const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      assert(ratio >= 4.5, foreground + '/' + background + ': text token contrast');
      console.log(JSON.stringify({ foreground, background, ratio: Number(ratio.toFixed(2)), method: 'opaque sRGB token calculation only' }));
    }
  }
  console.log('PASS: 17 routes and 32 opaque text-token pairs. No effects, browser DOM, geometry, focus, screenshots or human validation executed.');
} finally { await rm(temporary, { recursive: true, force: true }); }
