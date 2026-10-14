// Execute em processo Node separado, a partir da raiz do repositório.
// As mutações abaixo são apenas em arrays importados em memória, nunca em arquivos.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const load = p => import(pathToFileURL(path.join(root, p)).href);
const { components } = await load('src/data/components.mock.js');
const { compatibilityRules } = await load('src/data/compatibility-rules.mock.js');
const { checkBuildCompatibility } = await load('src/services/compatibility.service.js');
const { updateCompatibilityRule } = await load('src/services/compatibility-rule.service.js');
const { createAdminComponent } = await load('src/services/admin-component.service.js');
const rulesBefore = structuredClone(compatibilityRules);
const countBefore = components.length;
const selection = {
  cpu: 'cpu-intel-i5-12400f', motherboard: 'mb-b550m-aorus-elite',
  gpu: 'gpu-rtx-4060', ram: 'ram-kingston-fury-16gb-ddr4',
  storage: 'ssd-kingston-nv2-1tb', psu: 'psu-corsair-650w',
  case: 'case-mid-tower-airflow'
};
const result = {
  baselineCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  scope: 'Probes locais em processo isolado; nenhuma alteração persistente em código ou dados.'
};
try {
  const before = checkBuildCompatibility(selection);
  for (const rule of rulesBefore) updateCompatibilityRule(rule.id, { active: false });
  const after = checkBuildCompatibility(selection);
  result.disabledRules = {
    allRulesInactive: compatibilityRules.every(rule => !rule.active),
    beforeAlertCodes: before.alerts.map(alert => alert.code),
    afterAlertCodes: after.alerts.map(alert => alert.code)
  };
  assert.equal(result.disabledRules.allRulesInactive, true);
  assert.deepEqual(result.disabledRules.beforeAlertCodes, ['CPU_MOTHERBOARD_SOCKET_INCOMPATIBLE']);
  assert.deepEqual(result.disabledRules.afterAlertCodes, result.disabledRules.beforeAlertCodes);

  const board = createAdminComponent({
    id: 'audit-ephemeral-board', name: 'Audit ephemeral board',
    category: 'motherboard', price: 1,
    specs: { socket: 'LGA1700', memoryType: 'DDR4', formFactor: 'mATX', chipset: 'test' }
  });
  let failure = null;
  try { checkBuildCompatibility({ ...selection, motherboard: board.id }); }
  catch (error) { failure = error; }
  assert.ok(failure instanceof TypeError);
  assert.match(failure.message, /includes/);
  result.missingStorageInterfaces = {
    createAccepted: true,
    error: failure.name,
    message: failure.message,
    statusCode: failure.statusCode ?? null
  };
  result.assertions = 'passed';
} finally {
  compatibilityRules.splice(0, compatibilityRules.length, ...rulesBefore);
  components.splice(countBefore);
}
assert.equal(components.length, countBefore);
assert.deepEqual(compatibilityRules, rulesBefore);
result.inMemoryStateRestored = true;
const destination = path.join(root, 'docs/evidence/ra2-v2-baseline/backend-probes.json');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
