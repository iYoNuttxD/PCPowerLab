import test from 'node:test';
import assert from 'node:assert/strict';
import { selectionConflicts, stepSelectionConflicts } from '../src/utils/selectionConflicts.js';
const component = (name, specs) => ({name, specs});
test('incompatible selected CPU and board are explained immediately and resolve in either direction', () => {
 const build={cpu:component('Ryzen 5600',{socket:'AM4'}),motherboard:component('B650',{socket:'AM5'})};
 const before=JSON.stringify(build); assert.match(stepSelectionConflicts(build,'motherboard')[0].message,/AM4.*AM5/);
 assert.equal(stepSelectionConflicts(build,'cpu').length,1); assert.equal(stepSelectionConflicts(build,'gpu').length,0);
 assert.equal(stepSelectionConflicts({...build,cpu:component('Ryzen 7600',{socket:'AM5'})},'motherboard').length,0);
 assert.equal(stepSelectionConflicts({...build,motherboard:component('B550',{socket:'AM4'})},'cpu').length,0);
 assert.equal(JSON.stringify(build),before);
});
test('RAM, case/board and case/GPU conflicts are independent and retain explanatory units', () => {
 const build={motherboard:component('Board',{memoryType:'DDR5',formFactor:'ATX'}),ram:component('RAM',{memoryType:'DDR4'}),gpu:component('GPU',{lengthMm:310}),case:component('Case',{supportedFormFactors:['mATX'],maxGpuLengthMm:300})};
 assert.equal(selectionConflicts(build).length,3);assert.equal(stepSelectionConflicts(build,'case').length,2);
 assert.match(stepSelectionConflicts(build,'gpu')[0].message,/310 mm.*300 mm/);
});
test('unknown, malformed and absent specifications never create a fabricated incompatibility', () => {
 for(const value of [undefined,null,'',[],{},4]) assert.deepEqual(selectionConflicts({cpu:component('CPU',{socket:value}),motherboard:component('Board',{socket:'AM4'})}),[]);
 assert.deepEqual(selectionConflicts({motherboard:component('Board',{formFactor:'ATX'}),case:component('Case',{supportedFormFactors:[]})}),[]);
 assert.deepEqual(selectionConflicts({gpu:component('GPU',{lengthMm:'310'}),case:component('Case',{maxGpuLengthMm:300})}),[]);
});
