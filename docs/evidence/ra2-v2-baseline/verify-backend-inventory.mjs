// Verifica o inventário gerado contra os dados e serviços do checkout atual.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const root = process.cwd();
const load = p => import(pathToFileURL(path.join(root, p)).href);
const { components } = await load('src/data/components.mock.js');
const { checkBuildCompatibility } = await load('src/services/compatibility.service.js');
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'docs/RA2-V2-INVENTARIO.json'), 'utf8'));
assert.equal(inventory.components.length, components.length);
assert.equal(inventory.counts.components, components.length);
let witnesses = 0;
let images = 0;
for (const component of components) {
  const row = inventory.components.find(entry => entry.id === component.id);
  assert.ok(row);
  assert.equal(row.fullName, component.name);
  assert.equal(row.manufacturer, component.brand);
  assert.equal(row.category, component.category);
  assert.deepEqual(row.specs, component.specs);
  assert.equal(row.referencePrice.amount, component.price);
  if (row.image.repositoryPath) {
    const bytes = fs.readFileSync(path.join(root, row.image.repositoryPath));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), row.image.sha256);
    images += 1;
  }
  const witness = row.compatibilityRuleStatus.compatibleBuildWitness;
  if (witness) {
    assert.equal(witness[component.category], component.id);
    assert.equal(checkBuildCompatibility(witness).compatible, true);
    witnesses += 1;
  }
}
for (const [file, expected] of Object.entries(inventory.sourceHashes)) {
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'), expected, file);
}
assert.equal(images, inventory.counts.existingReferencedImages);
assert.equal(witnesses, inventory.counts.componentsWithCompatibleCompleteBuild);
console.log(`PASS: ${components.length} registros iguais às fontes; ${witnesses} testemunhas de build; ${images} imagens; hashes SHA-256 das fontes conferidos.`);
