import { createHash } from 'node:crypto';
import { URL } from 'node:url';
import { readFileSync } from 'node:fs';
const photoResearch = JSON.parse(readFileSync(new URL('./component-photo-research.json', import.meta.url), 'utf8'));

// One metadata record per component; names/specifications remain in the catalog.
// Reviewed public product photography: provenance and identity scope are recorded separately from reuse permission.
export const verifiedComponentImages = JSON.parse(readFileSync(new URL('./component-verified-images.json', import.meta.url), 'utf8'));

export function componentImageIdentity(component) {
  return createHash('sha256').update(JSON.stringify([component.name, component.brand, component.category, component.partNumber ?? null, component.specs])).digest('hex');
}

export function unavailableComponentImage(component, blocker) {
  const research = photoResearch[component.id];
  return {
    componentId: component.id,
    status: 'blocked',
    imagePath: null,
    imageSource: null,
    manufacturerProductUrl: research?.manufacturerProductUrl ?? component.specSourceUrl ?? null,
    rightsBasis: null,
    imageType: null,
    lastVerifiedAt: null,
    sourceResearchAt: research?.sourceResearchAt ?? null,
    blocker: blocker ?? research?.blocker ?? 'Fotografia do produto ainda não disponível.',
  };
}

export function attachComponentImage(component) {
  const image = verifiedComponentImages[component.id];
  return { ...component, image: image && image.productIdentity === componentImageIdentity(component) ? { ...image, componentId: component.id } : unavailableComponentImage(component, image ? 'Identidade do catálogo divergente da fotografia revisada. Revalidar modelo, variante e direitos.' : undefined) };
}
