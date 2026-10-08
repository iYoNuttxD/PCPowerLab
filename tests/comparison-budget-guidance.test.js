import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateComparisonScore, buildRecommendationReason } from '../src/utils/comparisonUtils.js';
const common={compatible:true,alertSummary:{high:0,medium:0,low:0},bottleneckSummary:{high:0,medium:0,low:0}};
test('performance criterion budget weighting is explicit rather than falsely claiming highest raw performance',()=>{
 const lower={...common,performanceScore:71.29,budgetStatus:'within_budget'};
 const higher={...common,performanceScore:71.86,budgetStatus:'above_budget'};
 assert.equal(calculateComparisonScore({build:lower,criteria:'performance'}),101.29);
 assert.equal(calculateComparisonScore({build:higher,criteria:'performance'}),71.86);
 assert(calculateComparisonScore({build:{...higher,budgetStatus:'within_budget'},criteria:'performance'})>101.29);
 const reason=buildRecommendationReason({criteria:'performance',selectedBuild:lower});
 assert.match(reason,/orçamento/);assert.match(reason,/desempenho bruto maior/);assert.doesNotMatch(reason,/Maior pontuação de desempenho simulado/);
});
