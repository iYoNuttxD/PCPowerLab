import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
const data = JSON.parse(readFileSync(new URL('./market-revalidation-catalog.json', import.meta.url), 'utf8'));
export const marketRevalidationCatalog = data.components;
export const marketReplacementMapping = data.replacementMapping;
export const marketReplacementNotes = data.replacementNotes;

export function attachMarketRevalidationLifecycle(component) {
  if (Object.hasOwn(marketReplacementMapping, component.id)) {
    return { ...component, active: false, lifecycle: 'legacy',
      replacementId: marketReplacementMapping[component.id],
      replacementNotes: marketReplacementNotes[component.id] || [],
      lifecycleReason: 'Referência anterior indisponível ou identidade comercial incompleta; configuração antiga preservada.',
      retiredAt: '2026-10-08' };
  }
  if (component.lifecycle === 'legacy' && marketReplacementMapping[component.replacementId]) {
    return { ...component, replacementId: marketReplacementMapping[component.replacementId],
      replacementNotes: [...(component.replacementNotes || []), 'A alternativa anterior também foi revista; trocar exige nova seleção explícita.'] };
  }
  return component;
}
