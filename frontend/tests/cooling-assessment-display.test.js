import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { listReadyBuilds } from '../../src/services/readyBuildsService.js';
import { listComponents } from '../../src/services/component.service.js';
import { getCoolingAssessment, hasUnverifiedCooling, compatibilityDisplayLabel } from '../src/utils/coolingAssessment.js';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pending = { status: 'unverified', scope: 'cooling_not_assessed', unverifiedChecks: [{ code: 'CPU_COOLING_FIT_UNVERIFIED', message: 'Dados do cooler não cadastrados.' }], alerts: [] };
const compatible = { compatible: true, status: 'compatible', alerts: [], coolingAssessment: pending };
const parts = Object.fromEntries(['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'].map(category => [category, { id: category, name: category, category, price: 100 }]));
let directory, ui, render;
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'pcpowerlab-cooling-ui-'));
  const output = join(directory, 'ui.mjs');
  const expose = {
    'BuildSummary.jsx': ['BuildStatusCard', 'BuildScorePanel', 'TechnicalReportView'],
    'ReadyBuilds.jsx': ['ReadyBuildChecks', 'ReadyBuildCard', 'RecommendationResultCard'],
    'Feedback.jsx': ['RecommendationSummary', 'CentralFeedback'],
    'UpgradeSuggestions.jsx': ['UpgradeRoadmap', 'createUpgradeFeedbackState']
  };
  await build({ stdin: { resolveDir: frontend, loader: 'jsx', contents: `
    export { default as React } from 'react';
    export { renderToStaticMarkup } from 'react-dom/server';
    export { MemoryRouter } from 'react-router-dom';
    export { ComponentsProvider } from './src/hooks/useComponents.js';
    export { default as CompatibilityStatus } from './src/components/compatibility/CompatibilityStatus.jsx';
    export { default as CoolingAssessmentNotice } from './src/components/compatibility/CoolingAssessmentNotice.jsx';
    export { default as RecommendationCard } from './src/components/recommendations/RecommendationCard.jsx';
    export { default as ComponentCard } from './src/components/componentsCatalog/ComponentCard.jsx';
    export { SoftwareResult } from './src/pages/PerformanceLab.jsx';
    export { default as GameComparisonResult } from './src/components/build/GameComparisonResult.jsx';
    export { default as GameSimulationResult } from './src/components/build/GameSimulationResult.jsx';
    export { BuildStatusCard, BuildScorePanel, TechnicalReportView } from './src/pages/BuildSummary.jsx';
    export { ReadyBuildChecks, ReadyBuildCard, RecommendationResultCard } from './src/pages/ReadyBuilds.jsx';
    export { RecommendationSummary, CentralFeedback } from './src/pages/Feedback.jsx';
    export { UpgradeRoadmap, createUpgradeFeedbackState } from './src/pages/UpgradeSuggestions.jsx';
  ` }, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'expose-private-renderers', setup(builder) {
      builder.onLoad({ filter: /\/pages\/(BuildSummary|ReadyBuilds|Feedback|UpgradeSuggestions)\.jsx$/ }, async ({ path }) => ({
        contents: await readFile(path, 'utf8') + `\nexport { ${expose[path.split('/').at(-1)].join(', ')} };`, loader: 'jsx'
      }));
    } }]
  });
  ui = await import(pathToFileURL(output));
  render = (Component, props) => ui.renderToStaticMarkup(ui.React.createElement(ui.MemoryRouter, null,
    ui.React.createElement(ui.ComponentsProvider, null, ui.React.createElement(Component, props))));
});
after(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

test('scoped cooling evidence is extracted without guessing absent or malformed assessments', () => {
  for (const value of [compatible, { compatibility: compatible }, { source: compatible }, { summary: compatible }, { technicalDetails: { compatibility: compatible } }]) {
    assert.deepEqual(getCoolingAssessment(value), pending);
    assert.equal(hasUnverifiedCooling(value), true);
    assert.equal(compatibilityDisplayLabel('compatible', value), 'Peças principais compatíveis');
  }
  for (const value of [null, {}, { coolingAssessment: [] }, { coolingAssessment: 'unverified' }, { coolingAssessment: { status: 'compatible' } }]) assert.equal(hasUnverifiedCooling(value), false);
  assert.equal(compatibilityDisplayLabel('incompatible', compatible), 'Incompatível');
  assert.equal(compatibilityDisplayLabel('unverified', compatible), 'Não verificada');
});

test('shared verdict visibly qualifies core compatibility while preserving explicit incompatibility', () => {
  const html = render(ui.CompatibilityStatus, { result: compatible });
  assert.match(html, /Peças principais compatíveis/);
  assert.match(html, /Refrigeração não verificada/);
  assert.match(html, /status-unverified/);
  const gpuPending = render(ui.CompatibilityStatus, { result: { compatible: false, status: 'unverified', unverifiedChecks: [{ code: 'CASE_GPU_LENGTH_UNVERIFIED', message: 'Confirme o espaço disponível para a placa de vídeo.' }] } });
  assert.match(gpuPending, /<strong>Espaço da placa de vídeo não verificado<\/strong>/);
  assert.match(gpuPending, /Confirme o espaço disponível/);
  assert.doesNotMatch(gpuPending, /CASE GPU LENGTH UNVERIFIED/);
  assert.doesNotMatch(html, /Build compatível|>OK</);
  const failed = render(ui.CompatibilityStatus, { result: { ...compatible, compatible: false, status: 'incompatible', alerts: [{ code: 'COOLER_TOO_TALL', message: 'Cooler ultrapassa o gabinete', severity: 'high' }] } });
  assert.match(failed, /incompatibilidades encontradas/);
  assert.match(failed, /Cooler ultrapassa o gabinete/);
  assert.doesNotMatch(failed, /Peças principais compatíveis/);
  const verified = render(ui.CompatibilityStatus, { result: { ...compatible, coolingAssessment: { status: 'compatible' } } });
  assert.match(verified, /Build compatível/);
  assert.doesNotMatch(verified, /Refrigeração não verificada/);
});

test('summary status, score and report retain the cooling qualifier', () => {
  const status = render(ui.BuildStatusCard, { compatibility: compatible, verified: true, incompatible: false });
  assert.match(status, /Peças principais compatíveis/);
  assert.match(status, /Refrigeração não verificada/);
  assert.doesNotMatch(status, />Verificado</);
  assert.match(render(ui.BuildScorePanel, { score: { overallScore: 70, criteria: {}, source: compatible } }), /Refrigeração não verificada/);
  const report = render(ui.TechnicalReportView, { report: { compatibility: compatible } });
  assert.match(report, /Refrigeração não verificada/);
  assert.match(report, /Peças principais compatíveis/);
});

test('ready and budget recommendations stay usable while visibly scoped', () => {
  assert.match(render(ui.ReadyBuildChecks, { readyBuild: { compatibility: compatible }, pricing: { complete: true } }), /Peças principais compatíveis/);
  assert.match(render(ui.ReadyBuildChecks, { readyBuild: { compatibility: compatible }, pricing: { complete: true } }), /Refrigeração não verificada/);
  const recommendation = { ...compatible, components: parts, totalEstimatedPrice: 700, compatibilityStatus: 'compatible' };
  const html = render(ui.RecommendationCard, { recommendation, onApply() {} });
  assert.match(html, /Refrigeração não verificada/);
  assert.match(html, /Usar recomendação inteira/);
  assert.doesNotMatch(html, /disabled=""/);
  const budget = render(ui.RecommendationResultCard, { recommendation, componentMap: Object.fromEntries(Object.values(parts).map(part => [part.id, part])) });
  assert.match(budget, /Peças principais compatíveis/);
  assert.match(budget, /Refrigeração não verificada/);
});

test('catalog and game results show scoped uncertainty without fabricating an FPS or incompatibility', () => {
  const card = render(ui.ComponentCard, { component: parts.cpu, compatibilityPreview: compatible });
  assert.match(card, /Compatível nas regras verificadas/);
  assert.match(card, /Refrigeração não verificada/);
  for (const available of [true, false]) {
    const html = render(ui.GameSimulationResult, { result: { game: 'Jogo', available, estimatedFps: 60, technicalDetails: { compatibility: compatible } } });
    assert.match(html, /Refrigeração não verificada/);
    if (!available) assert.doesNotMatch(html, /60 FPS/);
  }
});

test('immediate and saved feedback retain scoped cooling evidence; submitted snapshot remains intact', () => {
  const context = ui.createUpgradeFeedbackState({ suggestion: { componentType: 'cpu', suggestedComponent: { ...parts.cpu, id: 'cpu-new' }, coolingAssessment: pending }, selectedComponents: parts, title: 'Troca', source: 'upgrade' });
  assert.deepEqual(context.coolingAssessment, pending);
  assert.equal(context.buildSnapshot.cpuId, 'cpu-new');
  assert.equal(context.buildSnapshot.gpuId, 'gpu');
  const immediate = render(ui.RecommendationSummary, { context: { ...context, compatibilityStatus: 'compatible' }, selectedComponents: parts, hasRecommendationBuild: true });
  assert.match(immediate, /Peças principais compatíveis/);
  assert.match(immediate, /Refrigeração não verificada/);
  const saved = render(ui.CentralFeedback, { feedbacks: [{ id: 'feedback-1', rating: 4, recommendationType: 'general', coolingAssessment: pending }], filter: '', componentMap: {}, onFilterChange() {} });
  assert.match(saved, /Refrigeração não verificada/);
});


test('real Ryzen 5700X presets visibly qualify unassessed cooling while remaining selectable', () => {
  const presets = listReadyBuilds({}).filter(preset => preset.components.cpuId === 'cpu-ryzen-7-5700x');
  assert.equal(presets.length, 3);
  const componentMap = Object.fromEntries(listComponents().map(component => [component.id, component]));
  for (const preset of presets) {
    assert.equal(preset.compatibility.compatible, true);
    assert.equal(preset.compatibility.coolingAssessment.status, 'unverified');
    const before = JSON.stringify(preset);
    const html = render(ui.ReadyBuildCard, { readyBuild: preset, componentMap, onApply() {} });
    assert.match(html, /Peças principais compatíveis/);
    assert.match(html, /Refrigeração não verificada/);
    assert.match(html, /Usar build inteira/);
    assert.doesNotMatch(html, /disabled=""/);
    assert.doesNotMatch(html, /Compatibilidade: Compatível\./);
    assert.equal(JSON.stringify(preset), before);
  }
});


test('comparison and software task results retain pending cooling in available and unavailable states', () => {
  for (const available of [true, false]) {
    const comparison = render(ui.GameComparisonResult, { result: { compatibility: compatible, results: [{ game: 'Jogo', available, estimatedFps: 60 }] } });
    assert.match(comparison, /Refrigeração não verificada/);
    const software = render(ui.SoftwareResult, { result: { software: 'Programa', available, performanceScore: 70, technicalDetails: { compatibility: compatible } } });
    assert.match(software, /Refrigeração não verificada/);
    if (!available) {
      assert.doesNotMatch(comparison, /60 FPS<\/strong>/);
      assert.doesNotMatch(software, /<strong>70<\/strong>/);
    }
  }
});
