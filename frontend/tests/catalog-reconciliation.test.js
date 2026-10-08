import test from 'node:test';
import assert from 'node:assert/strict';
import { hydrateBuildComponents, calculateBuildPrice } from '../src/utils/buildHelpers.js';
import { reconcileBuildCatalog } from '../src/utils/buildTransitions.js';
const old={id:'cpu-a',category:'cpu',price:200,specs:{socket:'AM4'}};
const current={...old,price:350,pricing:{price:350,updateStatus:'dated_snapshot'}};
test('active hydration uses coherent current price and provenance while historical receipt remains unchanged',()=>{
 const receipt={cpu:old,fans:[]};
 assert.equal(hydrateBuildComponents(receipt,{[old.id]:current}).cpu.price,200);
 const active=hydrateBuildComponents(receipt,{[old.id]:current},{preferCatalog:true});
 assert.equal(active.cpu.price,350);assert.equal(active.cpu.pricing.price,350);assert.equal(receipt.cpu.price,200);
});
test('catalog update invalidates analysis once and reconciles undo history without losing choices/budget',()=>{
 const state={selectedComponents:{cpu:old,fans:[]},replacementHistory:[{cpu:old,fans:[]}],revision:4,summary:{old:true},gamePerformance:{estimatedFps:115},budget:{amount:500},wizardStep:'cpu'};
 const next=reconcileBuildCatalog(state,{[old.id]:current});
 assert.equal(next.revision,5);assert.equal(next.summary,null);assert.equal(next.gamePerformance,null);assert.equal(next.selectedComponents.cpu.id,old.id);assert.equal(next.budget,state.budget);
 assert.equal(next.replacementHistory[0].cpu.price,350);assert.equal(calculateBuildPrice(next.selectedComponents),350);
 assert.equal(reconcileBuildCatalog(next,{[old.id]:current}),next);
});
test('missing active catalog item retains identity but not a fictitious total, and can recover',()=>{
 const state={selectedComponents:{cpu:old,fans:[]},replacementHistory:[],revision:0};
 const missing=reconcileBuildCatalog(state,{});assert.equal(missing.selectedComponents.cpu.id,old.id);assert.equal(calculateBuildPrice(missing.selectedComponents),null);
 const recovered=reconcileBuildCatalog(missing,{[old.id]:current});assert.equal(recovered.selectedComponents.cpu.price,350);assert.equal(recovered.selectedComponents.cpu.catalogStatus,undefined);
});
test('fan quantities survive catalog reference updates',()=>{
 const state={selectedComponents:{fans:[{...old,id:'fan-a',quantity:3}]},replacementHistory:[],revision:0};
 const result=reconcileBuildCatalog(state,{'fan-a':{...current,id:'fan-a',category:'fan'}});
 assert.equal(result.selectedComponents.fans[0].quantity,3);assert.equal(calculateBuildPrice(result.selectedComponents),1050);
});
