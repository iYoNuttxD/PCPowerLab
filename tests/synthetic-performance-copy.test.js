import test from 'node:test';
import assert from 'node:assert/strict';
import { syntheticPerformanceProfiles } from '../src/data/synthetic-performance-profiles.js';
import { marketReplacementMapping, marketReplacementNotes } from '../src/data/market-revalidation-catalog.js';
import { findComponentById } from '../src/services/component.service.js';
import { unavailablePerformance } from '../src/utils/performanceAvailability.js';

for (const id of Object.keys(syntheticPerformanceProfiles)) {
  test(`synthetic score copy matches score and FPS availability: ${id}`, () => {
    const component = findComponentById(id);
    assert.ok(Number.isFinite(component.performanceScore));
    assert.equal(component.performanceMethodology.basis, 'simulated');
    assert.equal(component.performanceMethodology.simulationSupported, false);
    assert.equal(unavailablePerformance({ [component.category]: component }).available, false);
    const migrationNotes = Object.entries(marketReplacementMapping)
      .filter(([, successor]) => successor === id)
      .flatMap(([legacyId]) => marketReplacementNotes[legacyId] || []);
    const copy = [...(component.selectionNotes || []), ...migrationNotes].join(' ');
    assert.doesNotMatch(copy, /pontua[çc][ãa]o\s+(?:e\s+FPS\s+)?(?:ficam?\s+)?indispon[íi]v/i);
    assert.doesNotMatch(copy, /desempenho n[ãa]o calibrado no modelo/i);
    assert.ok(component.price > 0, 'Editorial notes cannot invalidate the verified quote identity');
    assert.equal(component.image.status, 'verified', 'Editorial notes cannot invalidate photo identity');
  });
}
