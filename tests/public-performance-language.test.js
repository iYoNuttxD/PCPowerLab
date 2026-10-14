import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPerformanceSummaryMessage } from '../src/utils/performanceSimulationUtils.js';
test('performance prose localizes quality values without changing API enums',()=>{
 for(const [qualityPreset,label] of [['low','baixa'],['medium','média'],['high','alta'],['ultra','ultra']]){
 const text=buildPerformanceSummaryMessage({gameName:'Jogo',qualityPreset,performanceLevel:'basic',meetsRecommendedRequirements:false});
 assert.match(text,/desempenho básico/);assert(text.includes(`qualidade ${label}`));assert(!/\bbasic\b/.test(text));
 }
});
