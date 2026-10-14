import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { listComponentRecords } from '../../../src/data/component.repository.js';
import { performanceParameters } from '../../../src/data/performanceParameters.js';
import { compatibilityRules } from '../../../src/data/compatibility-rules.mock.js';
import { getPurchaseLinksByComponentId } from '../../../src/services/purchaseLinksService.js';
import { marketIntegrationStatus, marketQuotes } from '../../../src/services/marketPriceService.js';
const root = new URL('../../../', import.meta.url);
const baseline = JSON.parse(readFileSync(new URL('docs/RA2-V2-INVENTARIO.json', root)));
const photos = JSON.parse(readFileSync(new URL('docs/RA2-COBERTURA-IMAGENS.json', root)));
const active = listComponentRecords();
assert.equal(new Set(active.map(c => c.id)).size, active.length);
const preserved = baseline.components.map(c => c.id).filter(id => active.some(c => c.id === id));
assert.equal(preserved.length, baseline.components.length);
assert.equal(photos.summary.active, active.length);
assert.equal(marketIntegrationStatus.connected, false);
assert.equal(marketQuotes.length, 0);
const counts = active.reduce((out, c) => ({ ...out, [c.category]: (out[c.category] || 0) + 1 }), {});
const components = active.map(c => {
  const links = getPurchaseLinksByComponentId(c.id);
  assert.ok(links.every(l => l.kind === 'research' && l.priceType === 'estimate' && l.queriedAt === null));
  const performance = performanceParameters.find(p => p.componentId === c.id) || null;
  assert.equal(Boolean(performance), !['cooler', 'fan'].includes(c.category));
  return { ...c, referencePrice: { amount: c.price, currency: 'BRL', marketQuote: false }, performance, purchaseLinks: links,
    compatibilityScope: ['cooler', 'fan'].includes(c.category) ? 'Optional cooling is priced/persisted; physical/electrical data incomplete; no blanket approval' : 'Shared coded rules; no BIOS/QVL/full physical certification',
    externalSpecificationVerifiedInFinalAudit: false };
});
const sourcePaths = ['src/data/components.mock.js', 'src/data/catalog.v21.js', 'src/data/performanceParameters.js', 'src/data/component-verified-images.json', 'src/services/compatibility.service.js', 'src/services/cooling.service.js'];
const output = { schemaVersion: 1, stage: 'v2.9', generatedAt: new Date().toISOString(), checkedSourceCommit: '5de7d88c906b2b66c63a4bc69e115045e012bf0d',
  scope: 'Current versioned catalog imports; excludes later runtime administration. Final audit fixes do not change catalog data.',
  counts: { active: active.length, byCategory: counts, air: active.filter(c => c.specs?.coolingType === 'air').length, aio: active.filter(c => c.specs?.coolingType === 'aio').length, performanceParameters: performanceParameters.length, purchaseSearchLinks: components.reduce((n,c) => n+c.purchaseLinks.length, 0), liveQuotes: marketQuotes.length, legacyIdsPreserved: preserved.length },
  photos: photos.summary, rules: { records: compatibilityRules.length, runtimeEngine: 'coded, independent of administrative CRUD', dynamicRuleEditingImplemented: false },
  limitations: ['Reference prices and model scores are not market quotes or benchmarks', 'Photo fallback is not a photograph', 'No browser, screenshots, human acceptance, thermal/QVL certification or multiuser production qualification'],
  sourceHashes: Object.fromEntries(sourcePaths.map(p => [p, createHash('sha256').update(readFileSync(new URL(p, root))).digest('hex')])), components };
writeFileSync(new URL('docs/RA2-V2.9-INVENTARIO.json', root), JSON.stringify(output, null, 2)+'\n');
console.log(JSON.stringify({ ...output.counts, photoCoverage: output.photos.coveragePercent, result: 'technical-integrity-passed; mandatory-photo-coverage-incomplete' }, null, 2));
