import { components } from '../src/data/components.mock.js';
import { performanceParameters } from '../src/data/performanceParameters.js';
import { purchaseLinks } from '../src/data/purchaseLinks.js';
const active = components.filter(component => component.active !== false);
const activeCounts = active.reduce((result, component) => ({ ...result, [component.category]: (result[component.category] || 0) + 1 }), {});
const counts = components.reduce((result, component) => ({ ...result, [component.category]: (result[component.category] || 0) + 1 }), {});
console.log(JSON.stringify({
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  stage: 'catalog-replacements-2026-10-08',
  source: 'Current catalog imports; run npm run inventory after catalog edits. Admin runtime changes require GET /api/v1/components.',
  counts, total: components.length, activeCounts, activeTotal: active.length, legacyTotal: components.filter(component => component.lifecycle === 'legacy').length, performanceParameters: performanceParameters.length,
  purchaseSearchLinks: purchaseLinks.length,
  limitations: ['Reference prices are not live offers', 'Cooling does not receive performance or FPS scores', 'Unknown cooling data does not verify physical compatibility'],
  components
}, null, 2));
