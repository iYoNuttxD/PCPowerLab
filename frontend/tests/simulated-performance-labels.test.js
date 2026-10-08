import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { hasSimulatedPerformance, performanceScoreLabel } from '../src/utils/performanceMethodology.js';

let server, ComponentCard, ComponentComparison, BottleneckPanel, SoftwareResult, GameComparisonResult, ComponentsProvider;
before(async () => {
  server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  ({ ComponentsProvider } = await server.ssrLoadModule('/src/hooks/useComponents.js'));
  ComponentCard = (await server.ssrLoadModule('/src/components/componentsCatalog/ComponentCard.jsx')).default;
  ComponentComparison = (await server.ssrLoadModule('/src/components/componentsCatalog/ComponentComparison.jsx')).default;
  BottleneckPanel = (await server.ssrLoadModule('/src/components/build/BottleneckPanel.jsx')).default;
  ({ SoftwareResult } = await server.ssrLoadModule('/src/pages/PerformanceLab.jsx'));
  GameComparisonResult = (await server.ssrLoadModule('/src/components/build/GameComparisonResult.jsx')).default;
});
after(async () => { await server?.close(); });
const render = (Component, props) => renderToStaticMarkup(React.createElement(ComponentsProvider, null, React.createElement(Component, props)));
const component = { id: 'cpu-synthetic', name: 'CPU de teste', category: 'cpu', specs: {}, price: 450, performanceScore: 67,
  performanceMethodology: { basis: 'simulated', kind: 'spec_score', shortLabel: 'Pontuação simulada', simulationSupported: false } };

test('score labels recognize aggregate, component and earlier methodology metadata without assuming measurements', () => {
  for (const source of [component, { performanceBasis: 'simulated' }, { performanceBasis: 'simulated_catalog_parameters' },
    { methodology: { performance: { basis: 'simulated_catalog_parameters' } } }]) {
    assert.equal(hasSimulatedPerformance(source), true);
    assert.equal(performanceScoreLabel(source), 'Pontuação simulada');
  }
  for (const source of [null, {}, { performanceBasis: 'unavailable' }, { performanceScore: 90 }, { performanceMethodology: 'simulated' }]) {
    assert.equal(hasSimulatedPerformance(source), false);
    assert.equal(performanceScoreLabel(source), 'Pontuação estimada');
  }
  assert.equal(hasSimulatedPerformance({}, component), true);
});

test('catalog cards label available simulated scores including zero, and omit absent or unsupported scores', () => {
  assert.match(render(ComponentCard, { component }), /Pontuação simulada: 67 \/ 100/);
  assert.match(render(ComponentCard, { component: { ...component, performanceScore: 0 } }), /Pontuação simulada: 0 \/ 100/);
  for (const variation of [{ performanceScore: null }, { performanceScore: '67' }, { category: 'fan' }, { category: 'cooler' }]) {
    assert.doesNotMatch(render(ComponentCard, { component: { ...component, ...variation } }), /Pontuação simulada|67 \/ 100|0 \/ 100/);
  }
});

test('comparison discloses score origin per component without turning absent values into zero', () => {
  const html = render(ComponentComparison, { components: [component, { ...component, id: 'cpu-none', performanceScore: null }] });
  assert.match(html, /Base da pontuação/);
  assert.match(html, /<td>Pontuação simulada<\/td><td>Não informado<\/td>/);
  assert.match(html, /<td>67<\/td><td>Não informado<\/td>/);
  assert.doesNotMatch(html, /<td>0<\/td>/);
});

test('available bottleneck and software scores show their simulated basis', () => {
  const bottlenecks = render(BottleneckPanel, { result: { performanceBasis: 'simulated', performanceSummary: { cpuScore: 0, gpuScore: 67 } } });
  assert.match(bottlenecks, /Pontuações simuladas de 0 a 100/);
  const software = render(SoftwareResult, { result: { software: 'Teste', performanceBasis: 'simulated', performanceScore: 0 } });
  assert.match(software, /Pontuação simulada \(0–100 pontos\)/);
  assert.match(software, /<strong>0<\/strong>/);
});

test('score-only metadata never overrides unavailable software or bottleneck results', () => {
  const result = { available: false, performanceBasis: 'simulated', performanceScore: 987, performanceSummary: { cpuScore: 987 },
    reason: 'performance_model_unavailable', software: 'Teste' };
  for (const Component of [SoftwareResult, BottleneckPanel]) {
    const html = render(Component, { result });
    assert.doesNotMatch(html, /987|Pontuação simulada|Pontuações simuladas/);
    assert.match(html, /Sem estimativa|indisponível/);
  }
});

test('game comparisons suppress stale FPS and requirements on unavailable rows even with simulated-score metadata', () => {
  const html = render(GameComparisonResult, { result: { results: [
    { gameName: 'Modelo ausente', available: false, performanceBasis: 'simulated', estimatedFps: 987, performanceLevel: 'excellent', meetsMinimumRequirements: false },
    { gameName: 'Modelo válido', available: true, estimatedFps: 0, meetsMinimumRequirements: true }
  ] } });
  assert.doesNotMatch(html, /987|Excelente|1 jogo\(s\) com requisitos mínimos não atendidos/);
  assert.match(html, /Sem estimativa/);
  assert.match(html, /Modelo válido<\/th><td>0<\/td>/);
  assert.match(html, /Modelo ausente<\/th><td>Não disponível<\/td><td>Sem estimativa<\/td><td>Não informado<\/td>/);
});
