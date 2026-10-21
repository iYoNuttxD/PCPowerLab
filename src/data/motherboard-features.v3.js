import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { componentImageIdentity } from './component-images.js';

export const motherboardFeatureEvidence = JSON.parse(readFileSync(new URL('./motherboard-features.v3.json', import.meta.url), 'utf8'));

// Comparison evidence is kept separate from immutable catalog/price identities.
// These features do not create a VRM quality score or prove BIOS/CPU support.
export function attachVerifiedMotherboardFeatures(component) {
  const evidence = motherboardFeatureEvidence[component.id];
  if (component.category !== 'motherboard' || !evidence
    || evidence.catalogIdentity !== componentImageIdentity(component)) return component;
  return { ...component, verifiedFeatures: globalThis.structuredClone(evidence) };
}
