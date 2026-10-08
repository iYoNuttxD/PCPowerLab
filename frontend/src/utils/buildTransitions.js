import { buildToApiPayload, hydrateBuildComponents } from './buildHelpers.js';
import { canApplyReplacement } from './replacementComparison.js';
import { componentTypes } from './componentLabels.js';

export const emptyResults = {
  compatibility: null, alerts: null, bottlenecks: null,
  recommendation: null, gamePerformance: null, summary: null
};

// Store input snapshots, never resurrect analyses from an earlier revision.
export function changeSelection(state, selectedComponents, { remember = true } = {}) {
  return {
    ...state, ...emptyResults, selectedComponents,
    revision: (state.revision || 0) + 1,
    replacementHistory: remember
      ? [...(state.replacementHistory || []), state.selectedComponents].slice(-20)
      : []
  };
}

export function analyzedResults(summary) {
  return {
    summary, compatibility: summary.compatibility, alerts: summary.compatibility,
    bottlenecks: summary.bottlenecks,
    gamePerformance: summary.gamePerformance?.available === false
      ? { ...summary.gamePerformance, status: 'unavailable' } : summary.gamePerformance || null
  };
}

export function replaceBuildComponent(state, type, component, summary, expectedRevision = state.revision) {
  if (expectedRevision !== state.revision || ![...componentTypes, 'cooler'].includes(type)
    || !component?.id || component.category !== type || state.selectedComponents[type]?.id === component.id) return state;
  // This operation has no authority to change any other slot or the budget.
  const next = changeSelection(state, { ...state.selectedComponents, [type]: component });
  if (summary && (!canApplyReplacement(summary)
    || JSON.stringify(buildToApiPayload(summary.components)) !== JSON.stringify(buildToApiPayload(next.selectedComponents)))) return state;
  return summary ? { ...next, ...analyzedResults(summary) } : next;
}

export function undoBuildReplacement(state) {
  const history = state.replacementHistory || [];
  if (!history.length) return state;
  return {
    ...changeSelection(state, history[history.length - 1], { remember: false }),
    replacementHistory: history.slice(0, -1)
  };
}

// Reconcile only the active working copy. Historical saved receipts are untouched.
export function reconcileBuildCatalog(state, componentMap) {
  function reconcile(selection) {
    const refreshed = hydrateBuildComponents(selection, componentMap, { preferCatalog: true });
    const mark = component => {
      if (!componentMap[component.id]) return { ...component, price: null, pricing: null, catalogStatus: 'unavailable' };
      const { catalogStatus: _status, ...known } = component;
      return known;
    };
    for (const [slot, component] of Object.entries(refreshed)) {
      refreshed[slot] = slot === 'fans' ? component.map(mark) : mark(component);
    }
    return refreshed;
  }
  const selectedComponents = reconcile(state.selectedComponents);
  const history = (state.replacementHistory || []).map(reconcile);
  const changed = JSON.stringify(selectedComponents) !== JSON.stringify(state.selectedComponents);
  if (!changed && JSON.stringify(history) === JSON.stringify(state.replacementHistory || [])) return state;
  return { ...state, ...(changed ? { ...emptyResults, revision: (state.revision || 0) + 1,
    catalogNotice: 'As peças da montagem foram atualizadas com as referências disponíveis no catálogo. Confira o orçamento e execute as análises novamente.' } : {}), selectedComponents, replacementHistory: history };
}
