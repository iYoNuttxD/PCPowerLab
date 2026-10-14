import test from 'node:test';
import assert from 'node:assert/strict';
import { compareBuilds } from '../src/services/buildComparisonService.js';
const components={cpuId:'cpu-ryzen-5-5600',motherboardId:'mb-b550m-aorus-elite',gpuId:'gpu-rtx-4060',ramId:'ram-kingston-fury-16gb-ddr4',storageId:'ssd-kingston-nv2-1tb',psuId:'psu-corsair-650w',caseId:'case-mid-tower-airflow'};
test('duplicate names have distinct response identities and recommendation refers to exact row',()=>{
 const result=compareBuilds({comparisonCriteria:'performance',builds:[{name:'Meu PC',components},{name:'Meu PC',components:{...components,cpuId:'cpu-ryzen-5-7600'}}]});
 assert.deepEqual(result.builds.map(build=>build.comparisonIndex),[0,1]);
 const selected=result.builds.find(build=>build.comparisonIndex===result.recommendedBuild.comparisonIndex);
 assert.equal(selected.comparisonScore,result.recommendedBuild.comparisonScore);
 assert.equal(result.builds[1].bottleneckStatus,'unavailable');
});
