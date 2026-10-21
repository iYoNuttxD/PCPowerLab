import test from 'node:test';
import assert from 'node:assert/strict';
import { components } from '../src/data/components.mock.js';
import { currentBuild } from './helpers/current-build.js';
import { selectBuildComponents } from '../src/services/build.service.js';
import { evaluateResolvedBuildCompatibility } from '../src/services/compatibility.service.js';

const resolved = () => globalThis.structuredClone(selectBuildComponents(currentBuild));
const has = (result, code) => [...result.alerts, ...result.unverifiedChecks].some(check => check.code === code);

test('V3 exact 3050 LP manufacturer evidence resolves unknown power without changing original catalog', () => {
  const build = resolved();
  const gpu = components.find(component => component.id === 'gpu-msi-rtx-3050-lp-6g-oc');
  const before = globalThis.structuredClone(gpu);
  build.gpu = gpu;
  const result = evaluateResolvedBuildCompatibility(build);
  assert.equal(has(result, 'GPU_POWER_CONNECTORS_UNVERIFIED'), false);
  assert.ok(result.verificationSources.some(source => source.componentId === gpu.id));
  assert.deepEqual(gpu, before);
});

test('V3 empty connectors without explicit evidence stay unknown; changed exact SKU loses supplemental evidence', () => {
  const build = resolved();
  build.gpu = { ...components.find(component => component.id === 'gpu-msi-rtx-3050-lp-6g-oc'), partNumber: 'different-sku' };
  build.gpu.specs = { ...build.gpu.specs, powerConnectors: [] };
  assert.ok(has(evaluateResolvedBuildCompatibility(build), 'GPU_POWER_CONNECTORS_UNVERIFIED'));
});

test('V3 Resizable BAR must be supported AND enabled, unknown does not mean compatible', () => {
  const build = resolved();
  build.gpu.specs.requiresResizableBar = true;
  assert.ok(has(evaluateResolvedBuildCompatibility(build), 'GPU_RESIZABLE_BAR_UNVERIFIED'));
  build.motherboard.specs.resizableBarSupported = true;
  assert.ok(has(evaluateResolvedBuildCompatibility(build), 'GPU_RESIZABLE_BAR_UNVERIFIED'));
  build.motherboard.specs.resizableBarEnabled = true;
  assert.equal(has(evaluateResolvedBuildCompatibility(build), 'GPU_RESIZABLE_BAR_UNVERIFIED'), false);
  build.motherboard.specs.resizableBarSupported = false;
  assert.ok(has(evaluateResolvedBuildCompatibility(build), 'GPU_RESIZABLE_BAR_UNSUPPORTED'));
});

test('V3 Arc boot requirements remain pending until installed UEFI/CSM/GPT are explicitly confirmed', () => {
  const build = resolved();
  build.gpu.specs.requiresUefiBoot = true;
  assert.ok(has(evaluateResolvedBuildCompatibility(build), 'GPU_UEFI_BOOT_UNVERIFIED'));
  build.motherboard.specs.uefiEnabled = true;
  build.motherboard.specs.csmDisabled = true;
  assert.ok(has(evaluateResolvedBuildCompatibility(build), 'GPU_UEFI_BOOT_UNVERIFIED'));
  build.storage.specs.gptPartitioned = true;
  assert.equal(has(evaluateResolvedBuildCompatibility(build), 'GPU_UEFI_BOOT_UNVERIFIED'), false);
});
