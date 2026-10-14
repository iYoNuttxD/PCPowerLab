import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readAnalysisSession, writeAnalysisSession } from '../src/utils/analysisSession.js';

let server, GameResult, SoftwareResult, validGameResult, validSoftwareResult, validComparisonResult;
before(async () => {
  server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' });
  GameResult = (await server.ssrLoadModule('/src/components/build/GameSimulationResult.jsx')).default;
  ({ SoftwareResult, validGameResult, validSoftwareResult, validComparisonResult } = await server.ssrLoadModule('/src/pages/PerformanceLab.jsx'));
});
after(async () => { await server?.close(); });

const unavailable = {
  available: false, reason: 'performance_model_unavailable',
  estimatedFps: null, performanceScore: null, performanceLevel: null,
  meetsMinimumRequirements: null, meetsRecommendedRequirements: null,
  summary: null, details: null, technicalDetails: null
};

test('unavailable panels show a factual reason without estimate boilerplate or stale numbers', () => {
  for (const [Component, label] of [[GameResult, { game: 'Jogo teste' }], [SoftwareResult, { software: 'Software teste' }]]) {
    for (const values of [unavailable, { ...unavailable, estimatedFps: 987, performanceScore: 987, summary: 'Old result', meetsMinimumRequirements: false }]) {
      const html = renderToStaticMarkup(React.createElement(Component, { result: { ...values, ...label } }));
      assert.match(html, /Sem estimativa/);
      assert.match(html, /componentes sem parâmetros de desempenho calibrados/);
      assert.doesNotMatch(html, /987|Old result|FPS estimado|Pontuação estimada|escala normalizada|abaixo dos requisitos|Ver requisitos/);
      assert.doesNotMatch(html, /placa de vídeo sem|GPU sem/);
    }
  }
});

test('nullable unavailable results are valid, and malformed availability is rejected', () => {
  assert.equal(validGameResult({ ...unavailable, game: 'Jogo' }), true);
  assert.equal(validSoftwareResult({ ...unavailable, software: 'Software' }), true);
  assert.equal(validComparisonResult({ results: [{ ...unavailable, gameName: 'Jogo' }] }), true);
  assert.equal(validGameResult({ game: 'Jogo', available: 'false' }), false);
  assert.equal(validSoftwareResult({ software: 'Software', reason: {} }), false);
});

test('an unavailable response replaces a previously saved estimate and survives module reload for both modes', async () => {
  const store = new Map();
  globalThis.sessionStorage = {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: key => store.delete(key)
  };
  try {
    for (const [slot, validator, label] of [
      ['performance-game-single', validGameResult, { game: 'Jogo' }],
      ['performance-software', validSoftwareResult, { software: 'Software' }]
    ]) {
      const successful = { ...label, estimatedFps: 144, performanceScore: 76 };
      writeAnalysisSession(slot, 'same-build', successful, validator);
      assert.deepEqual(readAnalysisSession(slot, 'same-build', validator), successful);
      const current = { ...unavailable, ...label };
      writeAnalysisSession(slot, 'same-build', current, validator);
      assert.deepEqual(readAnalysisSession(slot, 'same-build', validator), current);
      const reloaded = await import(`../src/utils/analysisSession.js?reload=${slot}`);
      const restored = reloaded.readAnalysisSession(slot, 'same-build', validator);
      assert.deepEqual(restored, current);
      const Component = slot === 'performance-game-single' ? GameResult : SoftwareResult;
      const html = renderToStaticMarkup(React.createElement(Component, { result: restored }));
      assert.match(html, /Sem estimativa/);
      assert.doesNotMatch(html, /144|<strong>76<\/strong>|FPS estimado|Pontuação estimada/);
    }
  } finally { delete globalThis.sessionStorage; }
});

test('available zero results still render as genuine estimates', () => {
  const game = renderToStaticMarkup(React.createElement(GameResult, { result: { game: 'Jogo', estimatedFps: 0 } }));
  const software = renderToStaticMarkup(React.createElement(SoftwareResult, { result: { software: 'Software', performanceScore: 0 } }));
  assert.match(game, /0 FPS/);
  assert.match(software, /<strong>0<\/strong>/);
  assert.doesNotMatch(game + software, /Sem estimativa/);
});
