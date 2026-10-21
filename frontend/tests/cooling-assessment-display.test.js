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

test('concise verdict retains factual conflicts and optional unknown cooling details', () => {
  const html=render(ui.CompatibilityStatus,{result:compatible});
  assert.match(html,/Nenhum conflito nos dados disponíveis/);
  assert.match(html,/<details[^>]*><summary>Detalhes da conferência/);
  assert.match(html,/Dados do cooler não cadastrados/);
  assert.doesNotMatch(html,/CPU_COOLING_FIT_UNVERIFIED/);
  const conflict=render(ui.CompatibilityStatus,{result:{...compatible,status:'incompatible',alerts:[{message:'Cooler ultrapassa o gabinete',code:'COOLER_TOO_TALL'}]}});
  assert.match(conflict,/Cooler ultrapassa o gabinete/);
  assert.match(conflict,/Você pode continuar/);
});
test('summary conclusion avoids duplicated warning badges while preserving useful actions', () => {
  const html=render(ui.BuildStatusCard,{compatibility:compatible,verified:true,incompatible:false});
  assert.match(html,/Nenhum conflito identificado nos dados analisados/);
  assert.doesNotMatch(html,/Verificações pendentes/);
});
test('recommendation shows primary apply action before secondary explanations', () => {
  const recommendation={...compatible,components:parts,totalEstimatedPrice:700,compatibilityStatus:'compatible'};
  const html=render(ui.RecommendationCard,{recommendation,onApply(){}});
  assert.ok(html.indexOf('Usar recomendação inteira')<html.indexOf('Como escolhemos estas peças'));
  assert.doesNotMatch(html,/disabled=""/);
});
test('catalog retains scoped uncertainty while game estimates present useful conclusion first', () => {
  const card=render(ui.ComponentCard,{component:parts.cpu,compatibilityPreview:compatible});
  assert.match(card,/Refrigeração não verificada/);
  const available=render(ui.GameSimulationResult,{result:{game:'Jogo',available:true,estimatedFps:60,technicalDetails:{compatibility:compatible}}});
  assert.match(available,/60 FPS/);
  assert.match(available,/Cenário aproximado/);
  const unavailable=render(ui.GameSimulationResult,{result:{game:'Jogo',available:false,estimatedFps:60}});
  assert.doesNotMatch(unavailable,/60 FPS/);
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
