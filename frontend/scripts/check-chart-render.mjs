// Static React markup and chart-data checks only. No server/browser is started.
// Run: node frontend/scripts/check-chart-render.mjs
import { build } from 'esbuild';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-charts-'));
const output = join(temporary, 'charts.mjs');
try {
  await build({
    stdin: {
      resolveDir: frontend, loader: 'jsx', contents: `
        export { default as React } from 'react';
        export { renderToStaticMarkup } from 'react-dom/server';
        export { MemoryRouter } from 'react-router-dom';
        export { ComponentsProvider } from './src/hooks/useComponents.js';
        export { default as BottleneckPanel, buildPowerData } from './src/components/build/BottleneckPanel.jsx';
        export { default as GameComparisonResult } from './src/components/build/GameComparisonResult.jsx';
        export { BuildScorePanel } from './src/pages/BuildSummary.jsx';
        export { RankingList } from './src/pages/Insights.jsx';
        export { ProfileWeights } from './src/components/usageProfiles/UsageProfilesManager.jsx';
      `
    },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'private-chart-test-exports', setup(builder) {
      // Export presentation functions only inside this temporary test bundle.
      builder.onLoad({ filter: /\/(BuildSummary|Insights|BottleneckPanel)\.jsx$/ }, async ({ path }) => {
        const name = path.endsWith('/BuildSummary.jsx') ? 'BuildScorePanel' : path.endsWith('/Insights.jsx') ? 'RankingList' : 'buildPowerData';
        return { contents: `${await readFile(path, 'utf8')}\nexport { ${name} };`, loader: 'jsx' };
      });
    }}]
  });
  const { React, renderToStaticMarkup, MemoryRouter, ComponentsProvider, BottleneckPanel, buildPowerData, GameComparisonResult, BuildScorePanel, RankingList, ProfileWeights } = await import(pathToFileURL(output).href);
  const render = (component, props) => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(ComponentsProvider, null, React.createElement(component, props))));
  const values = { cpuScore: 0, gpuScore: 90, ramScore: 65, storageScore: 80, estimatedConsumptionWatts: 300, psuWatts: 650 };
  const bottlenecks = performanceSummary => ({ result: { performanceSummary, hasBottleneck: false, bottlenecks: [] } });

  const unavailable = render(BottleneckPanel, { result: { status: 'unavailable', reason: 'missing_performance_parameters' } });
  assert(unavailable.includes('equipe responsável pelo catálogo'));
  const pending = render(BottleneckPanel, { result: { status: 'unavailable', reason: 'unverified_compatibility', message: 'Atencao: configuracao com fans sem verificacoes.' } });
  assert(pending.includes('Compatibilidade pendente') && pending.includes('Atenção: configuração com ventoinhas sem verificações.'));
  assert(!pending.includes('Unverified Compatibility'));
  assert(!unavailable.includes('href="/admin"'), 'public missing-data state must not advertise admin');
  let html = render(BottleneckPanel, bottlenecks(values));
  for (const label of ['Pontuação de desempenho por componente', 'Pontuações de 0 a 100', 'os pontos não são FPS', 'não o consumo medido na tomada', 'Consumo estimado: 300 W', 'Referência da fonte com folga: 450 W', 'Capacidade nominal da fonte: 650 W', '35% de folga', 'Fonte dos dados:', 'não garante segurança elétrica', '0 pontos']) assert(html.includes(label), label);
  assert.match(html, /Diferença entre capacidade da fonte e consumo estimado: <strong>350 W<\/strong>/);
  assert(html.includes('aria-describedby='));
  const power = buildPowerData(values);
  assert.deepEqual(power.values.map(({ shortName, watts }) => [shortName, watts]), [['Consumo', 300], ['Referência', 450], ['Fonte', 650]]);
  console.log('PASS: score/power titles, scales, sources, text equivalents and unchanged 35% reference');

  for (const incomplete of [{ powerEstimateComplete: false }, { unknownPowerComponents: ['cooler-unknown'] }]) {
    const input = { ...values, ...incomplete };
    html = render(BottleneckPanel, bottlenecks(input));
    assert(html.includes('Consumo parcial conhecido: 300 W'));
    assert(html.includes('Referência da fonte com folga: Não disponível'));
    assert(!html.includes('class="energy-note"'), 'partial estimate cannot show derived headroom');
    assert.equal(buildPowerData(input).values[1].watts, null);
    assert.equal(buildPowerData(input).values[0].shortName, 'Parcial');
  }
  console.log('PASS: incomplete cooling power is labeled and suppresses reference/headroom');

  for (const value of [undefined, null, '', ' ', false, [], {}, NaN]) {
    html = render(BottleneckPanel, bottlenecks({ cpuScore: value, gpuScore: 0, estimatedConsumptionWatts: value, psuWatts: 650 }));
    assert(html.includes('Pontuações ausentes não geram barras'));
    assert(html.includes('Consumo estimado: Não disponível'));
    assert(html.includes('Referência da fonte com folga: Não disponível'));
    assert(html.includes('Capacidade nominal da fonte: 650 W'));
    assert(!html.includes('class="energy-note"'));
  }
  html = render(BottleneckPanel, bottlenecks({}));
  assert(html.includes('Nenhuma pontuação de desempenho disponível'));
  assert(html.includes('Nenhum valor de potência disponível'));
  assert.equal(buildPowerData({ estimatedConsumptionWatts: 0, psuWatts: 0 }).values[1].watts, 0);
  console.log('PASS: missing chart values stay explicit and genuine zero is retained');

  const longName = 'Um jogo com nome muito longo que permanece completo na tabela';
  const comparison = { targetResolution: '1440p', qualityPreset: 'high', results: [
    { gameId: 'high', gameName: longName, estimatedFps: 144, meetsMinimumRequirements: false, meetsRecommendedRequirements: false },
    { gameId: 'zero', gameName: 'Zero verdadeiro', estimatedFps: 0, meetsMinimumRequirements: true },
    { gameId: 'unknown', gameName: 'Dado ausente', estimatedFps: ' ' }
  ] };
  html = render(GameComparisonResult, { result: comparison });
  for (const label of ['FPS estimado por jogo', 'não a verificação dos requisitos recomendados', 'Estimativa, não medição real.', '72 FPS', longName, 'Não disponível', 'não são tratados como zero', '1440p', 'role="region"', 'tabindex="0"', 'scope="row"', '<caption>']) assert(html.includes(label), label);
  assert.match(html, /Zero verdadeiro<\/th><td>0<\/td>/);
  assert.match(html, /Dado ausente<\/th><td>Não disponível<\/td>/);
  assert.match(html, /Abaixo da referência de 60 FPS<\/span><strong>1<\/strong>/);
  html = render(GameComparisonResult, { result: { results: [{ gameName: longName, estimatedFps: null }] } });
  assert(html.includes('Nenhum FPS disponível para o gráfico'));
  assert(!html.includes('class="game-comparison-chart"'));
  assert(html.includes(longName));
  assert(render(GameComparisonResult, { result: { results: [] } }).includes('Nenhum resultado retornado'));
  console.log('PASS: FPS table retains complete labels, requirements, unknown/zero data and settings; mean excludes unknown');

  for (const value of [undefined, null, '', ' ', false, [], {}, NaN]) {
    html = render(BuildScorePanel, { score: { overallScore: value, classification: 'Excelente', criteria: { compatibilityScore: 0, performanceScore: value } } });
    assert(html.includes('aria-label="Nota geral não disponível"'));
    assert(!html.includes('>Excelente<'));
    assert.match(html, /<span>Desempenho<\/span><strong>Não disponível<\/strong>/);
    assert.equal((html.match(/<i style="width:/g) || []).length, 1, 'only genuine zero draws a score bar');
    assert(html.includes('width:0%'));
  }
  html = render(BuildScorePanel, { score: { overallScore: 0, criteria: { compatibilityScore: 0 } } });
  assert(html.includes('aria-label="Nota 0 de 100"'));
  assert(html.includes('Não recomendada'));
  html = render(BuildScorePanel, { score: { overallScore: 75, criteria: { performanceScore: 80 }, warnings: ['Dado demonstrativo'] } });
  assert(html.includes('width:80%') && html.includes('Nota 75 de 100') && html.includes('Limitações desta nota') && html.includes('Dado demonstrativo'));
  console.log('PASS: summary score missing values are neither zero nor a negative classification; valid scores unchanged');

  html = render(RankingList, { ranking: [{ component: { id: 'missing', category: 'gpu', name: 'GPU desconhecida' }, performanceScore: null, costBenefitScore: null }] });
  assert(html.includes('Nota de custo-benefício indisponível'));
  assert(!html.includes('>0 / 100<') && !html.includes('>Baixo<'));
  html = render(RankingList, { ranking: [{ component: { id: 'known', category: 'gpu', name: 'GPU de teste' }, performanceScore: 70, costBenefitScore: 100 }] });
  assert(html.includes('70 / 100') && html.includes('100 / 100') && html.includes('Excelente'));
  html = render(ProfileWeights, { weights: { cpu: null, gpu: 0, ram: ' ', storage: 25, costBenefit: undefined } });
  assert.equal((html.match(/Não disponível/g) || []).length, 3);
  assert(html.includes('0%') && html.includes('25%'));
  assert.equal((html.match(/<b style=/g) || []).length, 2);
  console.log('PASS: ranking and weight bars preserve missing/zero distinctions and textual units');
  console.log('LIMITATION: SSR and data checks do not render Recharts SVG geometry, execute effects, or validate mobile layout, hover, keyboard focus, scrolling, assistive technology or user comprehension');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
