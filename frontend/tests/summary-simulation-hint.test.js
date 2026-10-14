import test from 'node:test';
import assert from 'node:assert/strict';
import { summarySimulationHint as hint } from '../src/utils/summarySimulationHint.js';
const ready={complete:true,gameAvailable:true};
test('completed estimate no longer asks the user to run it, including zero FPS',()=>{
 for(const estimatedFps of [0,115]) {const message=hint({...ready,result:{estimatedFps}});assert.match(message,/Estimativa atualizada/);assert(!message.includes('Execute a simulação'));}
});
test('current readiness, loading, unavailable and failure override stale success',()=>{
 const success={...ready,result:{estimatedFps:115}};
 assert.match(hint({...success,complete:false}),/Complete/);
 assert.match(hint({...success,gamesLoading:true}),/Aguarde/);
 assert.match(hint({...success,gamesError:'offline'}),/Recarregue/);
 assert.match(hint({...success,gameAvailable:false}),/Selecione/);
 assert.match(hint({...success,loading:true}),/Calculando/);
 assert.match(hint({...success,error:'failed'}),/tente novamente/);
 assert.match(hint({...success,result:{available:false,estimatedFps:115}}),/indisponível/);
 assert.match(hint({...ready,result:null}),/Execute/);
 for(const estimatedFps of [undefined,null,'115',NaN,Infinity]) assert.match(hint({...ready,result:{estimatedFps}}),/Execute/);
});
